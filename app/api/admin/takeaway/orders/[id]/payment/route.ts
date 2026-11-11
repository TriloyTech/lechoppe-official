import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/takeaway/admin";
import { DEFAULT_TAKEAWAY_SETTINGS, type PaymentMethod } from "@/lib/takeaway/types";
import { canChangePayment } from "@/lib/takeaway/lifecycle";
import { createAdminClient } from "@/lib/supabase/server";

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
  const status = String(body.payment_status);
  const method = body.payment_method as PaymentMethod | undefined;
  if (!(status === "UNPAID" || status === "PAID")) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const supabase = createAdminClient();
  try {
    const settingsResult = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "takeaway_settings")
      .maybeSingle();

    const accepted = (settingsResult.data?.value?.accepted_payment_methods ??
      DEFAULT_TAKEAWAY_SETTINGS.accepted_payment_methods) as PaymentMethod[];

    if (status === "PAID" && (!method || !accepted.includes(method))) {
      return NextResponse.json({ error: "Accepted payment method required" }, { status: 400 });
    }

    const { data: current, error: curError } = await supabase
      .from("takeaway_orders")
      .select("status, payment_status")
      .eq("id", id)
      .maybeSingle();

    if (curError || !current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canChangePayment(current.status, status)) {
      return NextResponse.json({ error: "Completed orders must remain paid" }, { status: 409 });
    }

    const { data: updated, error: updError } = await supabase
      .from("takeaway_orders")
      .update({
        payment_status: status,
        payment_method: status === "PAID" ? method : null,
        paid_at: status === "PAID" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select("id,status,payment_status,payment_method,paid_at")
      .single();

    if (updError) throw updError;

    await supabase.from("takeaway_order_events").insert({
      order_id: id,
      event_type: "PAYMENT_CHANGED",
      previous_status: current.status,
      new_status: current.status,
      performed_by: "staff",
      note: status === "PAID" ? method : "UNPAID",
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Payment update failed", error);
    return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
  }
}
