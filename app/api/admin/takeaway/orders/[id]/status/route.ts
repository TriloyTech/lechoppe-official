import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/takeaway/admin";
import type { OrderStatus } from "@/lib/takeaway/types";
import { canComplete, canTransition, ORDER_TRANSITIONS } from "@/lib/takeaway/lifecycle";
import { createAdminClient } from "@/lib/supabase/server";

const REASONS = new Set(["kitchen_capacity", "item_unavailable", "customer_request", "duplicate_or_fraud", "other"]);
const LABELS: Record<string, string> = {
  kitchen_capacity: "Cuisine saturée / Kitchen at capacity",
  item_unavailable: "Article indisponible / Item unavailable",
  customer_request: "Demande du client / Customer request",
  duplicate_or_fraud: "Doublon ou fraude / Duplicate or fraud",
  other: "Autre / Other",
};
const TIMESTAMPS: Partial<Record<OrderStatus, string>> = {
  ACCEPTED: "accepted_at",
  PREPARING: "preparing_at",
  READY: "ready_at",
  COMPLETED: "completed_at",
  CANCELLED: "cancelled_at",
  NO_SHOW: "no_show_at",
};
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const next = String(body.status) as OrderStatus;
  const reason = String(body.reason_code ?? "");
  const note = String(body.note ?? "").trim().slice(0, 500);

  if (!(next in ORDER_TRANSITIONS)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (next === "CANCELLED" && (!REASONS.has(reason) || (reason === "other" && !note))) {
    return NextResponse.json({ error: "A valid cancellation reason is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  try {
    const { data: current, error: curError } = await supabase
      .from("takeaway_orders")
      .select("status, payment_status")
      .eq("id", id)
      .maybeSingle();

    if (curError || !current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canTransition(current.status as OrderStatus, next)) {
      return NextResponse.json({ error: "Illegal status transition" }, { status: 409 });
    }
    if (next === "COMPLETED" && !canComplete(current.status as OrderStatus, current.payment_status)) {
      return NextResponse.json({ error: "Record onsite payment before completion" }, { status: 409 });
    }

    const updatePayload: Record<string, any> = { status: next };
    const timestamp = TIMESTAMPS[next];
    if (timestamp) updatePayload[timestamp] = new Date().toISOString();
    if (next === "CANCELLED") {
      updatePayload.cancellation_reason_code = reason;
      updatePayload.cancellation_reason_label = LABELS[reason];
      updatePayload.cancellation_note = note || null;
    }

    const { data: updated, error: updError } = await supabase
      .from("takeaway_orders")
      .update(updatePayload)
      .eq("id", id)
      .select("id,status,payment_status,cancellation_reason_code,cancellation_reason_label,cancellation_note")
      .single();
    if (updError) throw updError;

    await supabase.from("takeaway_order_events").insert({
      order_id: id,
      event_type: "STATUS_CHANGED",
      previous_status: current.status,
      new_status: next,
      performed_by: "staff",
      reason_code: next === "CANCELLED" ? reason : null,
      note: note || null,
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Takeaway status update failed", error);
    return NextResponse.json({ error: "Status update failed" }, { status: 500 });
  }
}
