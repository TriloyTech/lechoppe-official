import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { isAdmin } from "@/lib/takeaway/admin";

const STATUSES = new Set(["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "NO_SHOW"]);
const SAFE_ORDER_COLUMNS = `o.id, o.order_reference, o.customer_name, o.customer_email,
  o.customer_phone, o.pickup_time_type, o.pickup_time, o.customer_notes, o.status,
  o.payment_status, o.payment_method, o.subtotal_ttc, o.discount_ttc, o.promo_code,
  o.final_total_ttc, o.order_snapshot, o.cancellation_reason_code,
  o.cancellation_reason_label, o.cancellation_note, o.staff_notes, o.lang, o.placed_at,
  o.accepted_at, o.preparing_at, o.ready_at, o.completed_at, o.cancelled_at,
  o.no_show_at, o.paid_at`;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = request.nextUrl.searchParams.get("status");
  const search = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const values: unknown[] = [];
  const where: string[] = [];
  if (status && STATUSES.has(status)) { values.push(status); where.push(`o.status = $${values.length}`); }
  if (search) { values.push(`%${search}%`); where.push(`(o.order_reference ILIKE $${values.length} OR o.customer_name ILIKE $${values.length} OR o.customer_phone ILIKE $${values.length})`); }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) { values.push(from); where.push(`o.placed_at >= $${values.length}::date`); }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) { values.push(to); where.push(`o.placed_at < $${values.length}::date + interval '1 day'`); }
  const result = await pool.query(
    `SELECT ${SAFE_ORDER_COLUMNS},
       COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at) FROM takeaway_order_events e WHERE e.order_id = o.id), '[]'::jsonb) AS events
     FROM takeaway_orders o ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY CASE WHEN o.status IN ('NEW','ACCEPTED','PREPARING','READY') THEN 0 ELSE 1 END,
       o.pickup_time ASC, o.placed_at DESC LIMIT 200`,
    values,
  );
  return NextResponse.json({ orders: result.rows });
}
