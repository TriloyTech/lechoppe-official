import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { hashTrackingToken, isTrackingToken } from "@/lib/takeaway/security";
type Context = { params: Promise<{ token: string }> };
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: Context) { const { token } = await context.params; if (!isTrackingToken(token)) return NextResponse.json({ error: "Not found" }, { status: 404 }); const result = await pool.query("SELECT order_reference,pickup_time_type,pickup_time,status,payment_status,subtotal_ttc,discount_ttc,final_total_ttc,order_snapshot,placed_at,cancelled_at FROM takeaway_orders WHERE tracking_token_hash=$1", [hashTrackingToken(token)]); const order = result.rows[0]; if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json({ order: { order_reference: order.order_reference, pickup_time_type: order.pickup_time_type, pickup_time: order.pickup_time, status: order.status, payment_status: order.payment_status, subtotal_ttc: Number(order.subtotal_ttc), discount_ttc: Number(order.discount_ttc), final_total_ttc: Number(order.final_total_ttc), items: order.order_snapshot.items, placed_at: order.placed_at, cancelled_at: order.cancelled_at, can_cancel: order.status === "NEW" } }); }
