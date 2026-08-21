import test from "node:test";
import assert from "node:assert/strict";
import { applyDiscountToVatBreakdown, calculateUnitPrice, calculateVatBreakdown, mergeVatBreakdowns, toCents } from "../lib/takeaway/pricing.ts";
import { createBotChallenge, generateCandidateReference, generateTrackingToken, hashTrackingToken, isTrackingToken, verifyBotChallenge } from "../lib/takeaway/security.ts";
import { generateSlots, isValidPickupTime } from "../lib/takeaway/slots.ts";
import { renderOrderConfirmation } from "../lib/email/templates/OrderConfirmationEmail.ts";
import { createAdminSessionToken, verifyAdminSessionToken } from "../lib/admin/auth.ts";
import { mergeAndValidateTakeawaySettings, sanitizeTakeawaySettings, validateTakeawaySettingsPatch } from "../lib/takeaway/settings.ts";
import { findDeepLinkedItem, percentageDiscountCents, requireEligiblePromotion, validateBusinessQuantity, validateCatalogLookup, validateOptionSelections, validateSubtotalLimits } from "../lib/takeaway/orderRules.ts";
import { canChangePayment, canComplete, canCustomerCancel, canTransition } from "../lib/takeaway/lifecycle.ts";
import { BoundedRateLimiter, requestRateLimitKey } from "../lib/takeaway/rateLimit.ts";

const solve = (question) => { const [a, op, b] = question.split(" "); return op === "+" ? Number(a) + Number(b) : op === "−" ? Number(a) - Number(b) : Number(a) * Number(b); };
const settings = { takeaway_enabled: true, pause_mode: false, operating_hours: { monday: [{ open: "12:00", close: "13:00" }], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }, closing_cutoff_minutes: 0, prep_lead_time_minutes: 20, slot_interval_minutes: 15, advance_order_max_days: 0, max_orders_per_slot: 1, min_order_amount: 0, max_order_amount: 0, audio_alert_enabled: true, accepted_payment_methods: ["cash"] };

test("settings sanitize legacy fields and support GET/PATCH round trips", () => {
  const legacy = { ...settings, takeaway_promo_eligible: false }; const clean = sanitizeTakeawaySettings(legacy); assert.equal("takeaway_promo_eligible" in clean, false); assert.deepEqual(mergeAndValidateTakeawaySettings(legacy, clean).settings, clean);
  assert.throws(() => validateTakeawaySettingsPatch({ unknown: true }), /Unknown/); assert.throws(() => validateTakeawaySettingsPatch({ slot_interval_minutes: 1.5 }), /integer/); assert.throws(() => validateTakeawaySettingsPatch({ advance_order_max_days: 32 }), /between/); assert.throws(() => mergeAndValidateTakeawaySettings(settings, { min_order_amount: 20, max_order_amount: 10 }), /cannot exceed/);
});

test("server-signed bot challenges reject tampering, wrong answers, expiry, and replay", () => {
  const now = Date.now(); const valid = createBotChallenge(now); const answer = solve(valid.question); assert.equal(verifyBotChallenge(valid.challenge, answer, { now }).valid, true); assert.equal(verifyBotChallenge(valid.challenge, answer, { now }).reason, "replayed");
  const wrong = createBotChallenge(now); assert.equal(verifyBotChallenge(wrong.challenge, solve(wrong.question) + 1, { now }).reason, "answer");
  const tampered = `${wrong.challenge.slice(0, -1)}${wrong.challenge.endsWith("a") ? "b" : "a"}`; assert.equal(verifyBotChallenge(tampered, solve(wrong.question), { now }).reason, "tampered");
  const expired = createBotChallenge(now - 10 * 60_000 - 1); assert.equal(verifyBotChallenge(expired.challenge, solve(expired.question), { now }).reason, "expired");
});

test("bot challenge generation fails closed in production without its server secret", () => { const previousEnvironment = process.env.NODE_ENV; const previousSecret = process.env.BOT_CHECK_SECRET; try { process.env.NODE_ENV = "production"; delete process.env.BOT_CHECK_SECRET; assert.throws(() => createBotChallenge(), /not configured/); } finally { if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment; if (previousSecret === undefined) delete process.env.BOT_CHECK_SECRET; else process.env.BOT_CHECK_SECRET = previousSecret; } });
test("rate limits expire, remain bounded, and ignore untrusted forwarding headers", () => { const limiter = new BoundedRateLimiter(2); assert.equal(limiter.consume("a", 1, 100, 0).limited, false); assert.equal(limiter.consume("a", 1, 100, 1).limited, true); assert.equal(limiter.consume("a", 1, 100, 101).limited, false); limiter.consume("b", 1, 100, 101); limiter.consume("c", 1, 100, 101); const previous = process.env.TRUST_PROXY_HEADERS; try { delete process.env.TRUST_PROXY_HEADERS; assert.equal(requestRateLimitKey(new Headers({ "x-forwarded-for": "203.0.113.4" })), "network:untrusted-proxy"); } finally { if (previous === undefined) delete process.env.TRUST_PROXY_HEADERS; else process.env.TRUST_PROXY_HEADERS = previous; } });

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
test("admin sessions are signed and reject the legacy forgeable cookie", () => { const token = createAdminSessionToken(); const parts = token.split("."); const tampered = `${parts[0]}.${parts[1]}.${parts[2][0] === "0" ? "1" : "0"}${parts[2].slice(1)}`; assert.equal(verifyAdminSessionToken(token), true); assert.equal(verifyAdminSessionToken("1"), false); assert.equal(verifyAdminSessionToken(tampered), false); });
test("slots respect Paris operating hours and exact interval membership", () => { const now = new Date("2026-08-24T09:00:00Z"); const slots = generateSlots(settings, now); assert.equal(slots.length, 5); assert.equal(isValidPickupTime(slots[0], settings, now), true); assert.equal(isValidPickupTime(new Date("2026-08-24T10:07:00Z"), settings, now), false); });
test("confirmation email renders every supported language without leaking HTML", () => { for (const lang of ["fr", "en", "es", "it"]) { const output = renderOrderConfirmation({ lang, reference: "ECH-TEST", pickup: "12:30", total: 12.5, trackingUrl: "https://example.test/token", items: [{ quantity: 1, name: "<Test>" }] }); assert.match(output.text, /12\.50/); assert.match(output.html, /&lt;Test&gt;/); } });
