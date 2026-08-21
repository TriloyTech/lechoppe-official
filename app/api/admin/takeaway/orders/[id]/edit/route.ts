import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { isAdmin } from "@/lib/takeaway/admin";
import { sanitizeTakeawaySettings } from "@/lib/takeaway/settings";
import { isValidPickupTime } from "@/lib/takeaway/slots";

type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; if (!UUID.test(id)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const hasPickup = "pickup_time" in body; const hasNotes = "staff_notes" in body;
  if (!hasPickup && !hasNotes) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  const notes = hasNotes ? String(body.staff_notes ?? "").trim().slice(0, 1_000) : undefined;
  const pickup = hasPickup ? new Date(String(body.pickup_time)) : null;
  if (pickup && !Number.isFinite(pickup.getTime())) return NextResponse.json({ error: "Invalid pickup time" }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (pickup) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`takeaway_slot:${pickup.toISOString()}`]);
    const currentResult = await client.query("SELECT id,status,pickup_time,staff_notes FROM takeaway_orders WHERE id=$1 FOR UPDATE", [id]); const current = currentResult.rows[0];
    if (!current) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Not found" }, { status: 404 }); }
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(current.status)) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Terminal orders cannot be edited" }, { status: 409 }); }
    if (pickup && pickup.toISOString() !== new Date(current.pickup_time).toISOString()) {
      const settingsResult = await client.query("SELECT value FROM site_settings WHERE key=$1 FOR SHARE", ["takeaway_settings"]); const settings = sanitizeTakeawaySettings(settingsResult.rows[0]?.value);
      if (!isValidPickupTime(pickup, settings)) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Pickup slot is no longer valid" }, { status: 409 }); }
      if (settings.max_orders_per_slot > 0) { const count = await client.query("SELECT count(*)::int count FROM takeaway_orders WHERE pickup_time=$1 AND id<>$2 AND status<>'CANCELLED'", [pickup, id]); if (count.rows[0].count >= settings.max_orders_per_slot) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Pickup slot is full" }, { status: 409 }); } }
    }
    const updated = await client.query("UPDATE takeaway_orders SET pickup_time=COALESCE($1,pickup_time), pickup_time_type=CASE WHEN $1 IS NULL THEN pickup_time_type ELSE 'scheduled' END, staff_notes=CASE WHEN $2::boolean THEN $3 ELSE staff_notes END WHERE id=$4 RETURNING id,status,pickup_time,pickup_time_type,staff_notes", [pickup, hasNotes, notes || null, id]);
    const changes = { ...(pickup ? { pickup_time: pickup.toISOString() } : {}), ...(hasNotes ? { staff_notes_changed: true } : {}) };
    await client.query("INSERT INTO takeaway_order_events (order_id,event_type,previous_status,new_status,performed_by,note) VALUES ($1,'ORDER_EDITED',$2,$2,'staff',$3)", [id, current.status, JSON.stringify(changes)]);
    await client.query("COMMIT"); return NextResponse.json({ order: updated.rows[0] });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); console.error("Takeaway order edit failed", error); return NextResponse.json({ error: "Order edit failed" }, { status: 500 }); } finally { client.release(); }
}
