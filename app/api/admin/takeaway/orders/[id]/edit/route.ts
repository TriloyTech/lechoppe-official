import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/takeaway/admin";
import { sanitizeTakeawaySettings } from "@/lib/takeaway/settings";
import { isValidPickupTime } from "@/lib/takeaway/slots";
import { createAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const hasPickup = "pickup_time" in body;
  const hasNotes = "staff_notes" in body;
  if (!hasPickup && !hasNotes) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  const notes = hasNotes ? String(body.staff_notes ?? "").trim().slice(0, 1_000) : undefined;
  const pickup = hasPickup ? new Date(String(body.pickup_time)) : null;
  if (pickup && !Number.isFinite(pickup.getTime())) return NextResponse.json({ error: "Invalid pickup time" }, { status: 400 });

  const supabase = createAdminClient();
  try {
    const { data: current, error: curError } = await supabase
      .from("takeaway_orders")
      .select("id, status, pickup_time, staff_notes")
      .eq("id", id)
      .maybeSingle();

    if (curError || !current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(current.status)) {
      return NextResponse.json({ error: "Terminal orders cannot be edited" }, { status: 409 });
    }

    if (pickup && pickup.toISOString() !== new Date(current.pickup_time).toISOString()) {
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "takeaway_settings")
        .maybeSingle();
      const settings = sanitizeTakeawaySettings(settingsData?.value);

      if (!isValidPickupTime(pickup, settings)) {
        return NextResponse.json({ error: "Pickup slot is no longer valid" }, { status: 409 });
      }

      if (settings.max_orders_per_slot > 0) {
        const { count } = await supabase
          .from("takeaway_orders")
          .select("*", { count: "exact", head: true })
          .eq("pickup_time", pickup.toISOString())
          .neq("id", id)
          .neq("status", "CANCELLED");

        if ((count || 0) >= settings.max_orders_per_slot) {
          return NextResponse.json({ error: "Pickup slot is full" }, { status: 409 });
        }
      }
    }

    const updatePayload: Record<string, any> = {};
    if (pickup) {
      updatePayload.pickup_time = pickup.toISOString();
      updatePayload.pickup_time_type = "scheduled";
    }
    if (hasNotes) {
      updatePayload.staff_notes = notes || null;
    }

    const { data: updated, error: updError } = await supabase
      .from("takeaway_orders")
      .update(updatePayload)
      .eq("id", id)
      .select("id,status,pickup_time,pickup_time_type,staff_notes")
      .single();

    if (updError) throw updError;

    const changes = {
      ...(pickup ? { pickup_time: pickup.toISOString() } : {}),
      ...(hasNotes ? { staff_notes_changed: true } : {}),
    };

    await supabase.from("takeaway_order_events").insert({
      order_id: id,
      event_type: "ORDER_EDITED",
      previous_status: current.status,
      new_status: current.status,
      performed_by: "staff",
      note: JSON.stringify(changes),
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Takeaway order edit failed", error);
    return NextResponse.json({ error: "Order edit failed" }, { status: 500 });
  }
}
