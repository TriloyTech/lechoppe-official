import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { isAdmin } from "@/lib/takeaway/admin";
import type { OrderStatus } from "@/lib/takeaway/types";
import { canComplete, canTransition, ORDER_TRANSITIONS } from "@/lib/takeaway/lifecycle";

const REASONS = new Set(["kitchen_capacity", "item_unavailable", "customer_request", "duplicate_or_fraud", "other"]);
const LABELS: Record<string, string> = { kitchen_capacity: "Cuisine saturée / Kitchen at capacity", item_unavailable: "Article indisponible / Item unavailable", customer_request: "Demande du client / Customer request", duplicate_or_fraud: "Doublon ou fraude / Duplicate or fraud", other: "Autre / Other" };
const TIMESTAMPS: Partial<Record<OrderStatus, string>> = { ACCEPTED: "accepted_at", PREPARING: "preparing_at", READY: "ready_at", COMPLETED: "completed_at", CANCELLED: "cancelled_at", NO_SHOW: "no_show_at" };
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  let body: Record<string, unknown>; try { body = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const next = String(body.status) as OrderStatus; const reason = String(body.reason_code ?? ""); const note = String(body.note ?? "").trim().slice(0, 500);
  if (!(next in ORDER_TRANSITIONS)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (next === "CANCELLED" && (!REASONS.has(reason) || (reason === "other" && !note))) return NextResponse.json({ error: "A valid cancellation reason is required" }, { status: 400 });
  const client = await pool.connect(); try { await client.query("BEGIN"); const currentResult = await client.query("SELECT status, payment_status FROM takeaway_orders WHERE id = $1 FOR UPDATE", [id]); const current = currentResult.rows[0]; if (!current) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Not found" }, { status: 404 }); } if (!canTransition(current.status as OrderStatus, next)) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Illegal status transition" }, { status: 409 }); } if (next === "COMPLETED" && !canComplete(current.status as OrderStatus, current.payment_status)) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Record onsite payment before completion" }, { status: 409 }); }
    const timestamp = TIMESTAMPS[next]; const params: unknown[] = [next, id]; let sql = "UPDATE takeaway_orders SET status = $1"; if (timestamp) sql += `, ${timestamp} = now()`; if (next === "CANCELLED") { params.push(reason, LABELS[reason], note || null); sql += `, cancellation_reason_code = $3, cancellation_reason_label = $4, cancellation_note = $5`; } sql += " WHERE id = $2 RETURNING id,status,payment_status,cancellation_reason_code,cancellation_reason_label,cancellation_note"; const updated = await client.query(sql, params); await client.query("INSERT INTO takeaway_order_events (order_id,event_type,previous_status,new_status,performed_by,reason_code,note) VALUES ($1,'STATUS_CHANGED',$2,$3,'staff',$4,$5)", [id, current.status, next, next === "CANCELLED" ? reason : null, note || null]); await client.query("COMMIT"); return NextResponse.json({ order: updated.rows[0] });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); console.error("Takeaway status update failed", error); return NextResponse.json({ error: "Status update failed" }, { status: 500 }); } finally { client.release(); }
}
