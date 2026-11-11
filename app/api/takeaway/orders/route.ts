import { NextRequest, NextResponse } from "next/server";
import { type LocalizedText, type TakeawaySettings } from "@/lib/takeaway/types";
import { applyDiscountToVatBreakdown, calculateUnitPrice, calculateVatBreakdown, fromCents, mergeVatBreakdowns, resolveVatRate, toCents } from "@/lib/takeaway/pricing";
import { generateCandidateReference, generateTrackingToken, hashTrackingToken, MAX_REFERENCE_ATTEMPTS } from "@/lib/takeaway/security";
import { classifyPickupSlots, generateSlots } from "@/lib/takeaway/slots";
import { customerContactRateLimitIdentity, parseOrderPayload } from "@/lib/takeaway/validation";
import { sendOrderConfirmation } from "@/lib/email";
import { BoundedRateLimiter, requestRateLimitKey } from "@/lib/takeaway/rateLimit";
import { percentageDiscountCents, requireEligiblePromotion, validateBusinessQuantity, validateCatalogLookup, validateOptionSelections, validateSubtotalLimits } from "@/lib/takeaway/orderRules";
import { sanitizeTakeawaySettings } from "@/lib/takeaway/settings";
import { normalizePromoCode, validatePromotionRecord } from "@/lib/takeaway/promotions";
import { createAdminClient } from "@/lib/supabase/server";

const limiter = new BoundedRateLimiter(10_000);
const PUBLIC_ERRORS = new Set(["Takeaway ordering is closed", "Pickup slot is no longer valid", "ASAP must use the earliest available slot", "An item or option is unavailable", "Item unavailable", "Invalid option selection", "Option selection requirements changed", "Item quantity limit exceeded", "Invalid promotion code", "Order is below the minimum amount", "Order exceeds the maximum amount"]);

async function insertOrder(supabase: ReturnType<typeof createAdminClient>, orderData: Record<string, any>, snapshot: Record<string, any>) {
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt++) {
    const reference = generateCandidateReference();
    snapshot.order_reference = reference;
    const { data, error } = await supabase
      .from("takeaway_orders")
      .insert({
        ...orderData,
        order_reference: reference,
        order_snapshot: snapshot,
      })
      .select("id, order_reference")
      .single();

    if (!error && data) return data;
    if (error && error.code === "23505" && error.message.includes("order_reference")) continue;
    throw error || new Error("Order creation failed");
  }
  throw new Error("Order reference generation failed");
}

export async function POST(request: NextRequest) {
  const networkKey = requestRateLimitKey(request.headers);
  const networkRate = limiter.consume(networkKey, networkKey === "network:untrusted-proxy" ? 1_000 : 30, 10 * 60_000);
  if (networkRate.limited) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(networkRate.retryAfterSeconds) } });

  let body;
  try {
    body = parseOrderPayload(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }

  const contactRate = limiter.consume(`contact:${hashTrackingToken(customerContactRateLimitIdentity(body.customer_email, body.customer_phone))}`, 5, 60 * 60_000);
  if (contactRate.limited) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(contactRate.retryAfterSeconds) } });

  const supabase = createAdminClient();
  const token = generateTrackingToken();

  try {
    const pickup = new Date(body.pickup_time);
    const settingsResult = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "takeaway_settings")
      .maybeSingle();

    const settings: TakeawaySettings = sanitizeTakeawaySettings(settingsResult.data?.value);
    if (!settings.takeaway_enabled || settings.pause_mode) throw new Error("Takeaway ordering is closed");

    const generatedSlots = generateSlots(settings);
    if (!generatedSlots.some((slot) => slot.toISOString() === pickup.toISOString())) {
      throw new Error("Pickup slot is no longer valid");
    }

    const slotStrings = generatedSlots.map((s) => s.toISOString());
    const { data: slotOrders } = await supabase
      .from("takeaway_orders")
      .select("pickup_time")
      .in("pickup_time", slotStrings)
      .neq("status", "CANCELLED");

    const counts = new Map<string, number>();
    for (const row of slotOrders || []) {
      const key = new Date(row.pickup_time).toISOString();
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const classifiedSlots = classifyPickupSlots(generatedSlots, counts, settings.max_orders_per_slot);
    const selectedSlot = classifiedSlots.find((slot) => slot.value === pickup.toISOString());
    if (!selectedSlot?.available) {
      return NextResponse.json({ error: "Pickup slot is full" }, { status: 409 });
    }
    if (body.pickup_time_type === "asap" && selectedSlot.type !== "asap") {
      throw new Error("ASAP must use the earliest available slot");
    }

    const itemIds = [...new Set(body.items.map((line) => line.item_id))];
    const choiceIds = [...new Set(body.items.flatMap((line) => line.choice_ids))];

    const [itemsResult, choicesResult, linksResult] = await Promise.all([
      supabase.from("menu_items").select("id, name, description, price, vat_rate, max_quantity_per_order").in("id", itemIds).eq("available", true).eq("takeaway_available", true),
      choiceIds.length
        ? supabase.from("takeaway_option_choices").select("id, group_id, name, price_modifier, vat_rate_override, is_available, takeaway_option_groups(name, selection_type, min_selections, max_selections, is_required, is_active)").in("id", choiceIds)
        : Promise.resolve({ data: [] }),
      supabase.from("menu_item_option_groups").select("item_id, group_id, takeaway_option_groups(selection_type, min_selections, max_selections, is_required, is_active)").in("item_id", itemIds),
    ]);

    const itemsRows = itemsResult.data || [];
    const choicesRows = (choicesResult.data || []).map((c: any) => ({
      ...c,
      group_name: c.takeaway_option_groups?.name,
      selection_type: c.takeaway_option_groups?.selection_type,
      min_selections: c.takeaway_option_groups?.min_selections,
      max_selections: c.takeaway_option_groups?.max_selections,
      is_required: c.takeaway_option_groups?.is_required,
      is_active: c.takeaway_option_groups?.is_active,
    }));
    const linksRows = (linksResult.data || []).map((l: any) => ({
      item_id: l.item_id,
      group_id: l.group_id,
      selection_type: l.takeaway_option_groups?.selection_type,
      min_selections: l.takeaway_option_groups?.min_selections,
      max_selections: l.takeaway_option_groups?.max_selections,
      is_required: l.takeaway_option_groups?.is_required,
      is_active: l.takeaway_option_groups?.is_active,
    }));

    validateCatalogLookup(itemIds.length, itemsRows.length, choiceIds.length, choicesRows.length);

    const itemMap = new Map(itemsRows.map((row) => [row.id, row]));
    const choiceMap = new Map(choicesRows.map((row) => [row.id, row]));
    const groupsByItem = new Map<string, typeof linksRows>();
    for (const link of linksRows) {
      const list = groupsByItem.get(link.item_id) ?? [];
      list.push(link);
      groupsByItem.set(link.item_id, list);
    }

    const quantityByItem = new Map<string, number>();
    let subtotalCents = 0;
    const vatEntries = [];
    const snapshotItems = [];

    for (const line of body.items) {
      const item: any = itemMap.get(line.item_id);
      if (!item) throw new Error("Item unavailable");
      quantityByItem.set(item.id, (quantityByItem.get(item.id) ?? 0) + line.quantity);
      const linkedGroups = groupsByItem.get(item.id) ?? [];
      const selectedChoices: any[] = line.choice_ids.map((id) => choiceMap.get(id));
      validateOptionSelections(linkedGroups, selectedChoices);
      const unitCents = calculateUnitPrice(item.price, selectedChoices.map((choice) => choice.price_modifier));
      const lineCents = unitCents * line.quantity;
      subtotalCents += lineCents;

      const components = [
        { cents: toCents(item.price), vatRate: Number(item.vat_rate) },
        ...selectedChoices.map((choice) => ({
          cents: toCents(choice.price_modifier),
          vatRate: resolveVatRate(item.vat_rate, choice.vat_rate_override),
        })),
      ];
      const lineVat = calculateVatBreakdown(components, line.quantity, unitCents);
      vatEntries.push(...lineVat);

      snapshotItems.push({
        item_id: item.id,
        name: item.name,
        description: item.description,
        base_price: Number(item.price),
        vat_rate: Number(item.vat_rate),
        quantity: line.quantity,
        special_instructions: String(line.special_instructions ?? "").trim(),
        selected_options: selectedChoices.map((choice) => ({
          group_name: choice.group_name as LocalizedText,
          choice_name: choice.name as LocalizedText,
          price_modifier: Number(choice.price_modifier),
          vat_rate: resolveVatRate(item.vat_rate, choice.vat_rate_override),
        })),
        unit_price_ttc: fromCents(unitCents),
        line_total_ttc: fromCents(lineCents),
      });
    }

    for (const [itemId, quantity] of quantityByItem) {
      validateBusinessQuantity(Number(itemMap.get(itemId)?.max_quantity_per_order), quantity);
    }

    let discountCents = 0;
    let promoCode: string | null = null;
    if (body.promo_code) {
      const normalizedPromo = normalizePromoCode(body.promo_code);
      const { data: offerData } = await supabase
        .from("offers")
        .select("code, discount, active, takeaway_eligible, valid_until")
        .ilike("code", normalizedPromo)
        .limit(1)
        .maybeSingle();

      const validation = validatePromotionRecord(offerData);
      if (!validation.valid) throw new Error("Invalid promotion code");
      const offer = requireEligiblePromotion({ code: validation.code, discount: validation.discount_percentage });
      promoCode = offer.code;
      discountCents = percentageDiscountCents(subtotalCents, offer.discount);
    }

    validateSubtotalLimits(subtotalCents, toCents(settings.min_order_amount), toCents(settings.max_order_amount));
    const finalCents = Math.max(0, subtotalCents - discountCents);

    const snapshot: Record<string, unknown> = {
      order_reference: "",
      currency: "EUR",
      placed_at: new Date().toISOString(),
      customer: {
        name: body.customer_name,
        phone: body.customer_phone,
        email: body.customer_email,
        pickup_type: body.pickup_time_type,
        pickup_time: pickup.toISOString(),
        notes: body.customer_notes || null,
      },
      items: snapshotItems,
      totals: {
        subtotal_ttc: fromCents(subtotalCents),
        discount_ttc: fromCents(discountCents),
        promo_code: promoCode,
        final_total_ttc: fromCents(finalCents),
        vat_breakdown: applyDiscountToVatBreakdown(mergeVatBreakdowns(vatEntries), subtotalCents, finalCents),
      },
      cancellation: { reason_code: null, reason_label: null, note: null },
    };

    const orderData = {
      tracking_token_hash: hashTrackingToken(token),
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      pickup_time_type: body.pickup_time_type,
      pickup_time: pickup.toISOString(),
      customer_notes: body.customer_notes || null,
      subtotal_ttc: fromCents(subtotalCents),
      discount_ttc: fromCents(discountCents),
      promo_code: promoCode,
      final_total_ttc: fromCents(finalCents),
      lang: body.lang,
    };

    const order = await insertOrder(supabase, orderData, snapshot);

    await supabase.from("takeaway_order_events").insert({
      order_id: order.id,
      event_type: "ORDER_CREATED",
      previous_status: null,
      new_status: "NEW",
      performed_by: "customer",
    });

    void sendOrderConfirmation({
      to: body.customer_email,
      lang: body.lang,
      reference: order.order_reference,
      pickup: pickup.toLocaleString(body.lang, { timeZone: "Europe/Paris" }),
      total: fromCents(finalCents),
      trackingUrl: `${request.nextUrl.origin}/takeaway/order/${token}`,
      acceptedPaymentMethods: settings.accepted_payment_methods,
      items: snapshotItems.map((item) => ({
        quantity: item.quantity,
        name: item.name,
        options: item.selected_options.map((option) => option.choice_name[body.lang]),
      })),
    }).catch((err) => console.error("Takeaway confirmation email failed", err));

    return NextResponse.json(
      {
        success: true,
        order_reference: order.order_reference,
        tracking_url: `/takeaway/order/${token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error && PUBLIC_ERRORS.has(error.message) ? error.message : "Order creation failed";
    if (message === "Order creation failed") console.error("Takeaway order creation failed", error);
    const status =
      message === "Order creation failed"
        ? 500
        : message === "Takeaway ordering is closed"
        ? 530
        : [
            "Pickup slot is no longer valid",
            "ASAP must use the earliest available slot",
            "An item or option is unavailable",
            "Item unavailable",
            "Invalid option selection",
            "Option selection requirements changed",
          ].includes(message)
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
