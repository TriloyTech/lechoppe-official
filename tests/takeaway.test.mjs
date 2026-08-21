import test from "node:test";
import assert from "node:assert/strict";
import { applyDiscountToVatBreakdown, calculateUnitPrice, calculateVatBreakdown, mergeVatBreakdowns, toCents } from "../lib/takeaway/pricing.ts";
import { createBotChallenge, generateCandidateReference, generateTrackingToken, hashTrackingToken, isTrackingToken, verifyBotChallenge } from "../lib/takeaway/security.ts";
import { classifyPickupSlots, formatParisDateTimeLocal, generateSlots, isValidPickupTime, parisLocalDateTimeToUtc } from "../lib/takeaway/slots.ts";
import { renderOrderConfirmation } from "../lib/email/templates/OrderConfirmationEmail.ts";
import { createAdminSessionToken, verifyAdminSessionToken } from "../lib/admin/auth.ts";
import { mergeAndValidateTakeawaySettings, sanitizeTakeawaySettings, validateTakeawaySettingsPatch } from "../lib/takeaway/settings.ts";
import { findDeepLinkedItem, percentageDiscountCents, requireEligiblePromotion, validateBusinessQuantity, validateCatalogLookup, validateOptionSelections, validateSubtotalLimits } from "../lib/takeaway/orderRules.ts";
import { canChangePayment, canComplete, canCustomerCancel, canTransition } from "../lib/takeaway/lifecycle.ts";
import { BoundedRateLimiter, requestRateLimitKey } from "../lib/takeaway/rateLimit.ts";
import { customerContactRateLimitIdentity, normalizeCustomerPhone } from "../lib/takeaway/validation.ts";
import { buildAdminOrderEditPatch, createAdminOrderEditDraft } from "../lib/takeaway/adminOrderEdit.ts";
import { isTakeawayItemActionable } from "../lib/takeaway/menuEligibility.ts";
import { buildAdminOfferPayload, createAdminOfferDraft } from "../lib/takeaway/adminOffer.ts";
import { activeCategories, categoryLabel, visibleMenuItems } from "../lib/takeaway/categoryPresentation.ts";
import { appendCreated, removeById, removeGroupChoices } from "../lib/takeaway/optionDraftState.ts";

const solve = (question) => { const [a, op, b] = question.split(" "); return op === "+" ? Number(a) + Number(b) : op === "−" ? Number(a) - Number(b) : Number(a) * Number(b); };
const settings = { takeaway_enabled: true, pause_mode: false, operating_hours: { monday: [{ open: "12:00", close: "13:00" }], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }, closing_cutoff_minutes: 0, prep_lead_time_minutes: 20, slot_interval_minutes: 15, advance_order_max_days: 0, max_orders_per_slot: 1, min_order_amount: 0, max_order_amount: 0, audio_alert_enabled: true, accepted_payment_methods: ["cash"] };

test("settings sanitize legacy fields and support GET/PATCH round trips", () => {
  const legacy = { ...settings, takeaway_promo_eligible: false }; const clean = sanitizeTakeawaySettings(legacy); assert.equal("takeaway_promo_eligible" in clean, false); assert.deepEqual(mergeAndValidateTakeawaySettings(legacy, clean).settings, clean);
  assert.throws(() => validateTakeawaySettingsPatch({ unknown: true }), /Unknown/); assert.throws(() => validateTakeawaySettingsPatch({ slot_interval_minutes: 1.5 }), /integer/); assert.throws(() => validateTakeawaySettingsPatch({ advance_order_max_days: 32 }), /between/); assert.throws(() => mergeAndValidateTakeawaySettings(settings, { min_order_amount: 20, max_order_amount: 10 }), /cannot exceed/);
  assert.doesNotThrow(() => mergeAndValidateTakeawaySettings(settings, { operating_hours: { ...settings.operating_hours, monday: [{ open: "12:00", close: "14:00" }, { open: "19:00", close: "22:00" }] } }));
  assert.throws(() => mergeAndValidateTakeawaySettings(settings, { operating_hours: { ...settings.operating_hours, monday: [{ open: "12:00", close: "14:00" }, { open: "13:00", close: "15:00" }] } }), /overlap/);
  assert.throws(() => mergeAndValidateTakeawaySettings(settings, { operating_hours: { ...settings.operating_hours, monday: [{ open: "12:00", close: "14:00" }, { open: "12:00", close: "14:00" }] } }), /overlap/);
  const allDay = Object.fromEntries(Object.keys(settings.operating_hours).map((day) => [day, [{ open: "00:00", close: "23:59" }]])); assert.throws(() => mergeAndValidateTakeawaySettings(settings, { operating_hours: allDay, slot_interval_minutes: 1, advance_order_max_days: 31 }), /technical limit/);
});

test("admin offer drafts default Takeaway eligibility off and preserve explicit edits", () => {
  const fresh = createAdminOfferDraft();
  assert.equal(fresh.takeaway_eligible, false);
  assert.equal(buildAdminOfferPayload(fresh).takeaway_eligible, false);
  const existing = createAdminOfferDraft({ code: "TAKE20", discount: 20, active: true, takeaway_eligible: true, valid_until: "2026-12-31T23:59:59.999Z" });
  assert.equal(existing.takeaway_eligible, true);
  assert.equal(buildAdminOfferPayload(existing).takeaway_eligible, true);
});

test("shared menu categories localize, order, hide inactive sections, and fall back safely", () => {
  const categories = [
    { key: "hidden", emoji: "×", fr: "Masquée", en: "Hidden", es: "Oculta", it: "Nascosta", is_active: false, display_order: 0 },
    { key: "late", emoji: "2", fr: "Tard", en: "Late", es: "Tarde", it: "Tardi", is_active: true, display_order: 2 },
    { key: "early", emoji: "1", fr: "Tôt", en: "Early", es: "Temprano", it: "Presto", is_active: true, display_order: 1 },
  ];
  assert.deepEqual(activeCategories(categories).map((category) => category.key), ["early", "late"]);
  assert.deepEqual(visibleMenuItems([{ category: "hidden" }, { category: "early" }, { category: "legacy" }], categories).map((item) => item.category), ["early", "legacy"]);
  assert.equal(categoryLabel(categories[2], "es", "early"), "Temprano");
  assert.equal(categoryLabel({ key: "legacy", en: "Legacy", fr: "Héritage" }, "it", "legacy"), "Legacy");
  assert.equal(categoryLabel({ key: "fallback" }, "it", "fallback"), "fallback");
});

test("option group CRUD helpers preserve unrelated unsaved drafts", () => {
  const dirtyGroup = { id: "a", name: { es: "Borrador sin guardar" } };
  const groups = appendCreated([dirtyGroup, { id: "b", name: { es: "Grupo B" } }], { id: "c", name: { es: "Grupo C" } });
  assert.equal(groups[0], dirtyGroup);
  assert.equal(removeById(groups, "c")[0], dirtyGroup);
  const dirtyChoice = { id: "choice-a", group_id: "a", name: { es: "Opción sin guardar" } };
  const choices = appendCreated([dirtyChoice, { id: "choice-b", group_id: "b" }], { id: "choice-c", group_id: "b" });
  assert.equal(removeById(choices, "choice-b")[0], dirtyChoice);
  assert.equal(removeGroupChoices(choices, "b")[0], dirtyChoice);
});

test("server-signed bot challenges reject tampering, wrong answers, expiry, and replay", () => {
  const now = Date.now(); const valid = createBotChallenge(now); const answer = solve(valid.question); assert.equal(verifyBotChallenge(valid.challenge, answer, { now }).valid, true); assert.equal(verifyBotChallenge(valid.challenge, answer, { now }).reason, "replayed");
  const wrong = createBotChallenge(now); assert.equal(verifyBotChallenge(wrong.challenge, solve(wrong.question) + 1, { now }).reason, "answer");
  const tampered = `${wrong.challenge.slice(0, -1)}${wrong.challenge.endsWith("a") ? "b" : "a"}`; assert.equal(verifyBotChallenge(tampered, solve(wrong.question), { now }).reason, "tampered");
  const expired = createBotChallenge(now - 10 * 60_000 - 1); assert.equal(verifyBotChallenge(expired.challenge, solve(expired.question), { now }).reason, "expired");
});

test("bot challenge generation fails closed in production without its server secret", () => { const previousEnvironment = process.env.NODE_ENV; const previousSecret = process.env.BOT_CHECK_SECRET; try { process.env.NODE_ENV = "production"; delete process.env.BOT_CHECK_SECRET; assert.throws(() => createBotChallenge(), /not configured/); } finally { if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment; if (previousSecret === undefined) delete process.env.BOT_CHECK_SECRET; else process.env.BOT_CHECK_SECRET = previousSecret; } });
test("rate limits expire, remain bounded, and ignore untrusted forwarding headers", () => { const limiter = new BoundedRateLimiter(2); assert.equal(limiter.consume("a", 1, 100, 0).limited, false); assert.equal(limiter.consume("a", 1, 100, 1).limited, true); assert.equal(limiter.consume("a", 1, 100, 101).limited, false); limiter.consume("b", 1, 100, 101); limiter.consume("c", 1, 100, 101); const previous = process.env.TRUST_PROXY_HEADERS; try { delete process.env.TRUST_PROXY_HEADERS; assert.equal(requestRateLimitKey(new Headers({ "x-forwarded-for": "203.0.113.4" })), "network:untrusted-proxy"); } finally { if (previous === undefined) delete process.env.TRUST_PROXY_HEADERS; else process.env.TRUST_PROXY_HEADERS = previous; } });
test("customer contact normalization canonicalizes equivalent French phone formatting", () => { assert.equal(normalizeCustomerPhone("06 12 34 56 78"), "0612345678"); assert.equal(normalizeCustomerPhone("06-12-34-56-78"), "0612345678"); assert.equal(customerContactRateLimitIdentity(" TEST@Example.COM ", "06.12.34.56.78"), customerContactRateLimitIdentity("test@example.com", "0612345678")); assert.equal(normalizeCustomerPhone("+33 6 12 34 56 78"), "+33612345678"); });

test("pricing accepts modifiers, promotions, multiple VAT tiers, and reconciles every cent", () => {
  assert.equal(calculateUnitPrice(10, [2]), 1200); assert.equal(calculateUnitPrice(10, [0]), 1000); assert.equal(calculateUnitPrice(10, [-2]), 800); assert.equal(calculateUnitPrice(1, [-2]), 0);
  const one = applyDiscountToVatBreakdown(calculateVatBreakdown([{ cents: 1001, vatRate: 10 }], 1, 1001), 1001, 851); assert.equal(one.reduce((sum, row) => sum + toCents(row.base_ht) + toCents(row.vat_amount), 0), 851);
  const multiple = mergeVatBreakdowns([...calculateVatBreakdown([{ cents: 1001, vatRate: 5.5 }], 1, 1001), ...calculateVatBreakdown([{ cents: 999, vatRate: 20 }], 1, 999)]); const final = 1667; const discounted = applyDiscountToVatBreakdown(multiple, 2000, final); assert.equal(discounted.reduce((sum, row) => sum + toCents(row.base_ht) + toCents(row.vat_amount), 0), final); assert.equal(percentageDiscountCents(2000, 16.65), 333); assert.throws(() => percentageDiscountCents(1000, 120), /Invalid promotion/); assert.throws(() => requireEligiblePromotion(null), /Invalid promotion/); assert.equal(requireEligiblePromotion({ code: "TAKEAWAY", discount: "15" }).discount, 15);
});

test("order rules handle inactive groups, unavailable data, required selections, quantities, and subtotal limits", () => {
  const active = { group_id: "active", selection_type: "single", min_selections: 1, max_selections: 1, is_active: true }; const inactive = { ...active, group_id: "inactive", is_active: false };
  assert.doesNotThrow(() => validateOptionSelections([active, inactive], [{ id: "choice", group_id: "active", is_available: true, is_active: true }])); assert.throws(() => validateOptionSelections([active, inactive], [{ id: "hidden", group_id: "inactive", is_available: true, is_active: false }]), /Invalid option/); assert.throws(() => validateOptionSelections([active], []), /requirements/); assert.throws(() => validateOptionSelections([active], [{ id: "sold", group_id: "active", is_available: false, is_active: true }]), /Invalid option/);
  assert.throws(() => validateCatalogLookup(1, 0, 0, 0), /unavailable/); assert.throws(() => validateCatalogLookup(1, 1, 1, 0), /unavailable/); assert.doesNotThrow(() => validateBusinessQuantity(0, 999)); assert.throws(() => validateBusinessQuantity(3, 4), /quantity/); assert.doesNotThrow(() => validateSubtotalLimits(1000, 1000, 1000)); assert.throws(() => validateSubtotalLimits(999, 1000, 0), /minimum/); assert.throws(() => validateSubtotalLimits(1001, 0, 1000), /maximum/);
});

test("lifecycle, settlement, and customer cancellation rules remain authoritative", () => {
  assert.equal(canTransition("NEW", "ACCEPTED"), true); assert.equal(canTransition("NEW", "READY"), false); assert.equal(canComplete("READY", "UNPAID"), false); assert.equal(canComplete("READY", "PAID"), true); assert.equal(canChangePayment("COMPLETED", "UNPAID"), false); assert.equal(canCustomerCancel("NEW"), true); assert.equal(canCustomerCancel("ACCEPTED"), false);
});

test("tracking requires a cryptographic token rather than an order reference", () => { const token = generateTrackingToken(); assert.equal(isTrackingToken(token), true); assert.equal(isTrackingToken("ECH-ABCDE"), false); assert.match(hashTrackingToken(token), /^[0-9a-f]{64}$/); assert.match(generateCandidateReference(), /^ECH-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/); });
test("dish deep links select an exact item and invalid IDs degrade gracefully", () => { const items = [{ id: "dish-a" }, { id: "dish-b" }]; assert.equal(findDeepLinkedItem(items, "?item=dish-b")?.id, "dish-b"); assert.equal(findDeepLinkedItem(items, "?item=missing"), null); assert.equal(findDeepLinkedItem(items, ""), null); });
test("card and row takeaway CTAs are limited to eligible available dishes", () => { assert.equal(isTakeawayItemActionable({ available: true, takeaway_available: true }), true); assert.equal(isTakeawayItemActionable({ available: false, takeaway_available: true }), false); assert.equal(isTakeawayItemActionable({ available: true, takeaway_available: false }), false); });
test("admin sessions are signed and reject the legacy forgeable cookie", () => { const token = createAdminSessionToken(); const parts = token.split("."); const tampered = `${parts[0]}.${parts[1]}.${parts[2][0] === "0" ? "1" : "0"}${parts[2].slice(1)}`; assert.equal(verifyAdminSessionToken(token), true); assert.equal(verifyAdminSessionToken("1"), false); assert.equal(verifyAdminSessionToken(tampered), false); });
test("slots respect Paris time, deduplicate, and classify the earliest available slot as ASAP", () => { const now = new Date("2026-08-24T09:00:00Z"); const slots = generateSlots(settings, now); assert.equal(slots.length, 5); assert.equal(new Set(slots.map((slot) => slot.toISOString())).size, slots.length); const adjacent = generateSlots({ ...settings, prep_lead_time_minutes: 0, operating_hours: { ...settings.operating_hours, monday: [{ open: "12:00", close: "13:00" }, { open: "13:00", close: "14:00" }] } }, now); assert.equal(adjacent.length, 9); assert.equal(new Set(adjacent.map((slot) => slot.toISOString())).size, adjacent.length); assert.equal(isValidPickupTime(slots[0], settings, now), true); assert.equal(isValidPickupTime(new Date("2026-08-24T10:07:00Z"), settings, now), false); assert.equal(classifyPickupSlots(slots, new Map(), 1)[0].type, "asap"); const firstFull = classifyPickupSlots(slots, new Map([[slots[0].toISOString(), 1]]), 1); assert.equal(firstFull[0].available, false); assert.equal(firstFull[1].type, "asap"); assert.equal(classifyPickupSlots(slots, new Map(slots.map((slot) => [slot.toISOString(), 1])), 1).some((slot) => slot.type === "asap"), false); });
test("Paris admin pickup edits are timezone-independent and omit unchanged fields", () => { const original = { pickupTime: "2026-07-01T10:30:00.000Z", staffNotes: "Keep warm" }; const draft = createAdminOrderEditDraft(original); assert.deepEqual(draft, { pickup: "2026-07-01T12:30", notes: "Keep warm" }); assert.deepEqual(buildAdminOrderEditPatch(original, draft), {}); assert.deepEqual(buildAdminOrderEditPatch(original, { ...draft, notes: "New note" }), { staff_notes: "New note" }); assert.deepEqual(buildAdminOrderEditPatch(original, { ...draft, pickup: "2026-07-01T13:30" }), { pickup_time: "2026-07-01T11:30:00.000Z" }); assert.equal(formatParisDateTimeLocal(parisLocalDateTimeToUtc("2026-10-25T02:30")), "2026-10-25T02:30"); assert.throws(() => parisLocalDateTimeToUtc("2026-03-29T02:30"), /does not exist/); });
test("confirmation email renders configured onsite payment methods in every language", () => { const expected = { fr: "Espèces, Carte", en: "Cash, Card", es: "Efectivo, Tarjeta", it: "Contanti, Carta" }; for (const lang of ["fr", "en", "es", "it"]) { const subset = renderOrderConfirmation({ lang, reference: "ECH-TEST", pickup: "12:30", total: 12.5, trackingUrl: "https://example.test/token", acceptedPaymentMethods: ["cash", "card"], items: [{ quantity: 1, name: "<Test>" }] }); assert.match(subset.text, /12\.50/); assert.match(subset.html, /&lt;Test&gt;/); assert.ok(subset.text.includes(expected[lang])); assert.doesNotMatch(subset.text, /Swile/); const all = renderOrderConfirmation({ lang, reference: "ECH-TEST", pickup: "12:30", total: 12.5, trackingUrl: "https://example.test/token", acceptedPaymentMethods: ["cash", "card", "ticket_restaurant", "other"], items: [] }); assert.match(all.text, /Swile/); } });
