import test from "node:test";
import assert from "node:assert/strict";
import { applyDiscountToVatBreakdown, calculateUnitPrice, calculateVatBreakdown } from "../lib/takeaway/pricing.ts";
import { generateCandidateReference, generateTrackingToken, hashTrackingToken, isTrackingToken } from "../lib/takeaway/security.ts";
import { generateSlots, isValidPickupTime } from "../lib/takeaway/slots.ts";
import { renderOrderConfirmation } from "../lib/email/templates/OrderConfirmationEmail.ts";
import { createAdminSessionToken, verifyAdminSessionToken } from "../lib/admin/auth.ts";

test("pricing accepts positive, zero, and negative modifiers and floors the final unit", () => {
  assert.equal(calculateUnitPrice(10, [2]), 1200);
  assert.equal(calculateUnitPrice(10, [0]), 1000);
  assert.equal(calculateUnitPrice(10, [-2]), 800);
  assert.equal(calculateUnitPrice(1, [-2]), 0);
  assert.deepEqual(calculateVatBreakdown([{ cents: 1000, vatRate: 10 }], 2, 1000), [{ rate: 10, base_ht: 18.18, vat_amount: 1.82 }]);
  assert.deepEqual(applyDiscountToVatBreakdown([{ rate: 10, base_ht: 18.18, vat_amount: 1.82 }], 2000, 1000), [{ rate: 10, base_ht: 9.09, vat_amount: 0.91 }]);
});

test("tracking tokens and human references are cryptographically shaped", () => {
  const token = generateTrackingToken(); assert.equal(isTrackingToken(token), true); assert.match(hashTrackingToken(token), /^[0-9a-f]{64}$/); assert.match(generateCandidateReference(), /^ECH-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
});

test("admin sessions are signed and reject the legacy forgeable cookie", () => {
  const token = createAdminSessionToken(); const parts = token.split("."); const tampered = `${parts[0]}.${parts[1]}.${parts[2][0] === "0" ? "1" : "0"}${parts[2].slice(1)}`; assert.equal(verifyAdminSessionToken(token), true); assert.equal(verifyAdminSessionToken("1"), false); assert.equal(verifyAdminSessionToken(tampered), false);
});

test("slots respect Paris operating hours and exact interval membership", () => {
  const settings = { takeaway_enabled: true, pause_mode: false, operating_hours: { monday: [{ open: "12:00", close: "13:00" }], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }, closing_cutoff_minutes: 0, prep_lead_time_minutes: 20, slot_interval_minutes: 15, advance_order_max_days: 0, max_orders_per_slot: 1, min_order_amount: 0, max_order_amount: 0, audio_alert_enabled: true, accepted_payment_methods: ["cash"] };
  const now = new Date("2026-08-24T09:00:00Z"); const slots = generateSlots(settings, now); assert.equal(slots.length, 5); assert.equal(isValidPickupTime(slots[0], settings, now), true); assert.equal(isValidPickupTime(new Date("2026-08-24T10:07:00Z"), settings, now), false);
});

test("confirmation email renders every supported language without leaking HTML", () => {
  for (const lang of ["fr", "en", "es", "it"]) { const output = renderOrderConfirmation({ lang, reference: "ECH-TEST", pickup: "12:30", total: 12.5, trackingUrl: "https://example.test/token", items: [{ quantity: 1, name: "<Test>" }] }); assert.match(output.text, /12\.50/); assert.match(output.html, /&lt;Test&gt;/); }
});
