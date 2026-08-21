import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { hashTrackingToken, isTrackingToken } from "@/lib/takeaway/security";
import { canCustomerCancel } from "@/lib/takeaway/lifecycle";
type Context = { params: Promise<{ token: string }> };

export async function POST(_request: NextRequest, context: Context) {
  const { token } = await context.params; if (!isTrackingToken(token)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); const result = await client.query("SELECT id,status FROM takeaway_orders WHERE tracking_token_hash=$1 FOR UPDATE", [hashTrackingToken(token)]); const order = result.rows[0];
    if (!order) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Not found" }, { status: 404 }); }
    if (!canCustomerCancel(order.status)) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Cancellation is no longer available" }, { status: 409 }); }
    await client.query("UPDATE takeaway_orders SET status='CANCELLED',cancelled_at=now(),cancellation_reason_code='customer_request',cancellation_reason_label='Demande du client / Customer request' WHERE id=$1", [order.id]);
    await client.query("INSERT INTO takeaway_order_events (order_id,event_type,previous_status,new_status,performed_by,reason_code) VALUES ($1,'STATUS_CHANGED','NEW','CANCELLED','customer','customer_request')", [order.id]);
    await client.query("COMMIT"); return NextResponse.json({ success: true });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); console.error("Customer cancellation failed", error); return NextResponse.json({ error: "Cancellation failed" }, { status: 500 }); } finally { client.release(); }
}
