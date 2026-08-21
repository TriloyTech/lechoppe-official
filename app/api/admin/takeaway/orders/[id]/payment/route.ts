import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { isAdmin } from "@/lib/takeaway/admin";
import { DEFAULT_TAKEAWAY_SETTINGS, type PaymentMethod } from "@/lib/takeaway/types";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; const body = await request.json(); const status = String(body.payment_status); const method = body.payment_method as PaymentMethod | undefined;
  if (!(status === "UNPAID" || status === "PAID")) return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  const settingsResult = await pool.query("SELECT value FROM site_settings WHERE key = $1", ["takeaway_settings"]); const accepted = (settingsResult.rows[0]?.value?.accepted_payment_methods ?? DEFAULT_TAKEAWAY_SETTINGS.accepted_payment_methods) as PaymentMethod[];
  if (status === "PAID" && (!method || !accepted.includes(method))) return NextResponse.json({ error: "Accepted payment method required" }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); const current = await client.query("SELECT status,payment_status FROM takeaway_orders WHERE id=$1 FOR UPDATE", [id]);
    if (!current.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Not found" }, { status: 404 }); }
    if (current.rows[0].status === "COMPLETED" && status !== "PAID") { await client.query("ROLLBACK"); return NextResponse.json({ error: "Completed orders must remain paid" }, { status: 409 }); }
    const updated = await client.query("UPDATE takeaway_orders SET payment_status=$1,payment_method=$2,paid_at=$3 WHERE id=$4 RETURNING *", [status, status === "PAID" ? method : null, status === "PAID" ? new Date() : null, id]);
    await client.query("INSERT INTO takeaway_order_events (order_id,event_type,previous_status,new_status,performed_by,note) VALUES ($1,'PAYMENT_CHANGED',$2,$2,'staff',$3)", [id, current.rows[0].status, status === "PAID" ? method : "UNPAID"]); await client.query("COMMIT");
    return NextResponse.json({ order: updated.rows[0] });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); console.error("Payment update failed", error); return NextResponse.json({ error: "Payment update failed" }, { status: 500 }); } finally { client.release(); }
}
