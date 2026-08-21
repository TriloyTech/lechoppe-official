import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { pool } from "@/lib/postgres/db";
import { DEFAULT_TAKEAWAY_SETTINGS, type LocalizedText, type TakeawaySettings } from "@/lib/takeaway/types";
import { applyDiscountToVatBreakdown, calculateUnitPrice, calculateVatBreakdown, fromCents, mergeVatBreakdowns, toCents } from "@/lib/takeaway/pricing";
import { generateCandidateReference, generateTrackingToken, hashTrackingToken, MAX_REFERENCE_ATTEMPTS } from "@/lib/takeaway/security";
import { generateSlots, isValidPickupTime } from "@/lib/takeaway/slots";
import { parseOrderPayload } from "@/lib/takeaway/validation";
import { sendOrderConfirmation } from "@/lib/email";

const attempts = new Map<string, number[]>();
const PUBLIC_ERRORS = new Set(["Takeaway ordering is closed", "Pickup slot is no longer valid", "ASAP must use the earliest available slot", "An item or option is unavailable", "Item unavailable", "Invalid option selection", "An option group is unavailable", "Option selection requirements changed", "Item quantity limit exceeded", "Invalid promotion code", "Order is below the minimum amount", "Order exceeds the maximum amount"]);
function rateLimited(key: string) { const now = Date.now(); const recent = (attempts.get(key) ?? []).filter((value) => value > now - 10 * 60_000); recent.push(now); attempts.set(key, recent); return recent.length > 5; }

async function insertOrder(client: PoolClient, values: unknown[]) {
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt++) {
    const reference = generateCandidateReference();
    const snapshot = values[11] as Record<string, unknown>; snapshot.order_reference = reference;
    try {
      await client.query("SAVEPOINT order_reference");
      const result = await client.query(`INSERT INTO takeaway_orders (order_reference, tracking_token_hash, customer_name, customer_email, customer_phone, pickup_time_type, pickup_time, customer_notes, subtotal_ttc, discount_ttc, promo_code, final_total_ttc, order_snapshot, lang) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14) RETURNING id, order_reference`, [reference, ...values.slice(0, 11), JSON.stringify(snapshot), values[12]]);
      await client.query("RELEASE SAVEPOINT order_reference"); return result.rows[0];
    } catch (error: unknown) {
      const dbError = error as { code?: string; constraint?: string };
      await client.query("ROLLBACK TO SAVEPOINT order_reference");
      if (dbError.code === "23505" && dbError.constraint === "uq_takeaway_orders_order_reference") continue;
      throw error;
    }
  }
  throw new Error("Order reference generation failed");
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  let body; try { body = parseOrderPayload(await request.json()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 }); }
  const client = await pool.connect(); const token = generateTrackingToken();
  try {
    await client.query("BEGIN"); await client.query("SET LOCAL statement_timeout = '10s'");
    const pickup = new Date(body.pickup_time); await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`takeaway_slot:${pickup.toISOString()}`]);
    const settingsResult = await client.query("SELECT value FROM site_settings WHERE key = $1 FOR SHARE", ["takeaway_settings"]); const settings: TakeawaySettings = { ...DEFAULT_TAKEAWAY_SETTINGS, ...(settingsResult.rows[0]?.value ?? {}) };
    if (!settings.takeaway_enabled || settings.pause_mode) throw new Error("Takeaway ordering is closed");
    if (!isValidPickupTime(pickup, settings)) throw new Error("Pickup slot is no longer valid");
    if (body.pickup_time_type === "asap" && generateSlots(settings)[0]?.toISOString() !== pickup.toISOString()) throw new Error("ASAP must use the earliest available slot");
    if (settings.max_orders_per_slot > 0) { const count = await client.query("SELECT count(*)::int AS count FROM takeaway_orders WHERE pickup_time = $1 AND status <> 'CANCELLED'", [pickup]); if (count.rows[0].count >= settings.max_orders_per_slot) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Pickup slot is full" }, { status: 409 }); } }
    const itemIds = [...new Set(body.items.map((line) => line.item_id))]; const choiceIds = [...new Set(body.items.flatMap((line) => line.choice_ids))];
    const [itemsResult, choicesResult, linksResult] = await Promise.all([
      client.query("SELECT id, name, description, price, vat_rate, max_quantity_per_order FROM menu_items WHERE id = ANY($1::uuid[]) AND available AND takeaway_available AND vat_rate IS NOT NULL FOR SHARE", [itemIds]),
      choiceIds.length ? client.query("SELECT c.id, c.group_id, c.name, c.price_modifier, c.vat_rate_override, c.is_available, g.name AS group_name, g.selection_type, g.min_selections, g.max_selections, g.is_required, g.is_active FROM takeaway_option_choices c JOIN takeaway_option_groups g ON g.id = c.group_id WHERE c.id = ANY($1::uuid[]) FOR SHARE OF c, g", [choiceIds]) : Promise.resolve({ rows: [] }),
      client.query("SELECT link.item_id, link.group_id, g.selection_type, g.min_selections, g.max_selections, g.is_required, g.is_active FROM menu_item_option_groups link JOIN takeaway_option_groups g ON g.id = link.group_id WHERE link.item_id = ANY($1::uuid[]) FOR SHARE OF link, g", [itemIds]),
    ]);
    if (itemsResult.rows.length !== itemIds.length || choicesResult.rows.length !== choiceIds.length) throw new Error("An item or option is unavailable");
    const itemMap = new Map(itemsResult.rows.map((row) => [row.id, row])); const choiceMap = new Map(choicesResult.rows.map((row) => [row.id, row])); const groupsByItem = new Map<string, typeof linksResult.rows>(); for (const link of linksResult.rows) { const list = groupsByItem.get(link.item_id) ?? []; list.push(link); groupsByItem.set(link.item_id, list); }
    const quantityByItem = new Map<string, number>(); let subtotalCents = 0; const vatEntries = []; const snapshotItems = [];
    for (const line of body.items) {
      const item = itemMap.get(line.item_id); if (!item) throw new Error("Item unavailable"); quantityByItem.set(item.id, (quantityByItem.get(item.id) ?? 0) + line.quantity);
      const linkedGroups = groupsByItem.get(item.id) ?? []; const linkedIds = new Set(linkedGroups.map((group) => group.group_id)); const selectedChoices = line.choice_ids.map((id) => choiceMap.get(id)); if (selectedChoices.some((choice) => !choice || !choice.is_available || !choice.is_active || !linkedIds.has(choice.group_id))) throw new Error("Invalid option selection");
      const selections = new Map<string, number>(); for (const choice of selectedChoices) selections.set(choice.group_id, (selections.get(choice.group_id) ?? 0) + 1);
      for (const group of linkedGroups) { if (!group.is_active) throw new Error("An option group is unavailable"); const count = selections.get(group.group_id) ?? 0; if (count < group.min_selections || count > group.max_selections || (group.selection_type === "single" && count > 1)) throw new Error("Option selection requirements changed"); }
      const unitCents = calculateUnitPrice(item.price, selectedChoices.map((choice) => choice.price_modifier)); const lineCents = unitCents * line.quantity; subtotalCents += lineCents;
      const components = [{ cents: toCents(item.price), vatRate: Number(item.vat_rate) }, ...selectedChoices.map((choice) => ({ cents: toCents(choice.price_modifier), vatRate: Number(choice.vat_rate_override ?? item.vat_rate) }))]; const lineVat = calculateVatBreakdown(components, line.quantity, unitCents); vatEntries.push(...lineVat);
      snapshotItems.push({ item_id: item.id, name: item.name, description: item.description, base_price: Number(item.price), vat_rate: Number(item.vat_rate), quantity: line.quantity, special_instructions: String(line.special_instructions ?? "").trim(), selected_options: selectedChoices.map((choice) => ({ group_name: choice.group_name as LocalizedText, choice_name: choice.name as LocalizedText, price_modifier: Number(choice.price_modifier), vat_rate: Number(choice.vat_rate_override ?? item.vat_rate) })), unit_price_ttc: fromCents(unitCents), line_total_ttc: fromCents(lineCents) });
    }
    for (const [itemId, quantity] of quantityByItem) { const max = Number(itemMap.get(itemId).max_quantity_per_order); if (max > 0 && quantity > max) throw new Error("Item quantity limit exceeded"); }
    let discountCents = 0; let promoCode: string | null = null; if (body.promo_code) { const offer = await client.query("SELECT code, discount FROM offers WHERE upper(code) = $1 AND active AND takeaway_eligible AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)", [body.promo_code]); if (!offer.rows[0]) throw new Error("Invalid promotion code"); promoCode = offer.rows[0].code; discountCents = Math.min(subtotalCents, Math.round(subtotalCents * Math.max(0, Math.min(100, Number(offer.rows[0].discount))) / 100)); }
    const finalCents = Math.max(0, subtotalCents - discountCents); if (toCents(settings.min_order_amount) > 0 && finalCents < toCents(settings.min_order_amount)) throw new Error("Order is below the minimum amount"); if (toCents(settings.max_order_amount) > 0 && finalCents > toCents(settings.max_order_amount)) throw new Error("Order exceeds the maximum amount");
    const snapshot: Record<string, unknown> = { order_reference: "", currency: "EUR", placed_at: new Date().toISOString(), customer: { name: body.customer_name, phone: body.customer_phone, email: body.customer_email, pickup_type: body.pickup_time_type, pickup_time: pickup.toISOString(), notes: body.customer_notes || null }, items: snapshotItems, totals: { subtotal_ttc: fromCents(subtotalCents), discount_ttc: fromCents(discountCents), promo_code: promoCode, final_total_ttc: fromCents(finalCents), vat_breakdown: applyDiscountToVatBreakdown(mergeVatBreakdowns(vatEntries), subtotalCents, finalCents) }, cancellation: { reason_code: null, reason_label: null, note: null } };
    const order = await insertOrder(client, [hashTrackingToken(token), body.customer_name, body.customer_email, body.customer_phone, body.pickup_time_type, pickup, body.customer_notes || null, fromCents(subtotalCents), fromCents(discountCents), promoCode, fromCents(finalCents), snapshot, body.lang]);
    await client.query("INSERT INTO takeaway_order_events (order_id, event_type, previous_status, new_status, performed_by) VALUES ($1,'ORDER_CREATED',NULL,'NEW','customer')", [order.id]); await client.query("COMMIT");
    void sendOrderConfirmation({ to: body.customer_email, lang: body.lang, reference: order.order_reference, pickup: pickup.toLocaleString(body.lang, { timeZone: "Europe/Paris" }), total: fromCents(finalCents), trackingUrl: `${request.nextUrl.origin}/takeaway/order/${token}`, items: snapshotItems.map((item) => ({ quantity: item.quantity, name: item.name, options: item.selected_options.map((option) => option.choice_name[body.lang]) })) }).catch((error) => console.error("Takeaway confirmation email failed", error));
    return NextResponse.json({ success: true, order_reference: order.order_reference, tracking_url: `/takeaway/order/${token}` }, { status: 201 });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); const message = error instanceof Error && PUBLIC_ERRORS.has(error.message) ? error.message : "Order creation failed"; if (message === "Order creation failed") console.error("Takeaway order creation failed", error); return NextResponse.json({ error: message }, { status: message === "Order creation failed" ? 500 : 400 }); } finally { client.release(); }
}
