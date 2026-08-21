import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { isAdmin } from "@/lib/takeaway/admin";

const STATUSES = new Set(["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = request.nextUrl.searchParams.get("status"); const search = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100); const values: unknown[] = []; const where: string[] = [];
  if (status && STATUSES.has(status)) { values.push(status); where.push(`o.status = $${values.length}`); }
  if (search) { values.push(`%${search}%`); where.push(`(o.order_reference ILIKE $${values.length} OR o.customer_name ILIKE $${values.length} OR o.customer_phone ILIKE $${values.length})`); }
  const result = await pool.query(`SELECT o.*, COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at) FROM takeaway_order_events e WHERE e.order_id = o.id), '[]'::jsonb) AS events FROM takeaway_orders o ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY CASE WHEN o.status IN ('NEW','ACCEPTED','PREPARING','READY') THEN 0 ELSE 1 END, o.pickup_time ASC, o.placed_at DESC LIMIT 200`, values);
  return NextResponse.json({ orders: result.rows });
}
