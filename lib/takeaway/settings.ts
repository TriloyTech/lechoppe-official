import { DEFAULT_TAKEAWAY_SETTINGS, type PaymentMethod, type TakeawaySettings } from "./types.ts";
import { estimateConfiguredSlotCount, MAX_GENERATED_SLOTS } from "./slots.ts";

const PAYMENT_METHODS = new Set<PaymentMethod>(["cash", "card", "ticket_restaurant", "other"]);
const INTEGER_LIMITS = {
  closing_cutoff_minutes: 24 * 60,
  prep_lead_time_minutes: 24 * 60,
  slot_interval_minutes: 24 * 60,
  advance_order_max_days: 31,
  max_orders_per_slot: 1_000,
} as const;
const AMOUNT_KEYS = ["min_order_amount", "max_order_amount"] as const;
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SETTING_KEYS: readonly (keyof TakeawaySettings)[] = [
  "takeaway_enabled", "pause_mode", "operating_hours", "closing_cutoff_minutes",
  "prep_lead_time_minutes", "slot_interval_minutes", "advance_order_max_days",
  "max_orders_per_slot", "min_order_amount", "max_order_amount",
  "audio_alert_enabled", "accepted_payment_methods",
];

export function sanitizeTakeawaySettings(value: unknown): TakeawaySettings {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, key in source ? source[key] : DEFAULT_TAKEAWAY_SETTINGS[key]])) as unknown as TakeawaySettings;
}

export function validateTakeawaySettingsPatch(input: unknown): Partial<TakeawaySettings> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid settings payload");
  const body = input as Record<string, unknown>;
  const allowed = new Set<string>(SETTING_KEYS);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error("Unknown settings field");
  for (const key of ["takeaway_enabled", "pause_mode", "audio_alert_enabled"] as const) {
    if (key in body && typeof body[key] !== "boolean") throw new Error(`${key} must be boolean`);
  }
  for (const [key, maximum] of Object.entries(INTEGER_LIMITS) as [keyof typeof INTEGER_LIMITS, number][]) {
    if (!(key in body)) continue;
    const value = body[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > maximum) throw new Error(`${key} must be an integer between 0 and ${maximum}`);
  }
  if ("slot_interval_minutes" in body && body.slot_interval_minutes === 0) throw new Error("slot_interval_minutes must be at least 1");
  for (const key of AMOUNT_KEYS) {
    if (key in body && (typeof body[key] !== "number" || !Number.isFinite(body[key]) || (body[key] as number) < 0 || (body[key] as number) > 100_000)) throw new Error(`${key} must be between 0 and 100000`);
  }
  if ("accepted_payment_methods" in body && (!Array.isArray(body.accepted_payment_methods) || body.accepted_payment_methods.length === 0 || body.accepted_payment_methods.some((value) => !PAYMENT_METHODS.has(value as PaymentMethod)))) throw new Error("Invalid accepted payment methods");
  if ("operating_hours" in body) {
    const hours = body.operating_hours as Record<string, unknown>;
    if (!hours || typeof hours !== "object" || Array.isArray(hours) || Object.keys(hours).some((key) => !DAYS.includes(key as typeof DAYS[number])) || DAYS.some((day) => !Array.isArray(hours[day]) || (hours[day] as unknown[]).length > 4 || (hours[day] as unknown[]).some((window) => {
      if (!window || typeof window !== "object") return true;
      const value = window as { open?: unknown; close?: unknown };
      return typeof value.open !== "string" || typeof value.close !== "string" || !TIME.test(value.open) || !TIME.test(value.close) || value.open >= value.close;
    }))) throw new Error("Invalid operating hours");
    for (const day of DAYS) {
      const windows = (hours[day] as { open: string; close: string }[]).toSorted((a, b) => a.open.localeCompare(b.open));
      if (windows.some((window, index) => index > 0 && window.open < windows[index - 1].close)) throw new Error("Operating hours cannot overlap");
    }
  }
  return body as Partial<TakeawaySettings>;
}

export function mergeAndValidateTakeawaySettings(current: unknown, patch: unknown) {
  const cleanPatch = validateTakeawaySettingsPatch(patch);
  const merged = { ...sanitizeTakeawaySettings(current), ...cleanPatch };
  validateTakeawaySettingsPatch({ operating_hours: merged.operating_hours });
  if (merged.max_order_amount > 0 && merged.min_order_amount > merged.max_order_amount) throw new Error("Minimum order amount cannot exceed maximum order amount");
  if (estimateConfiguredSlotCount(merged) > MAX_GENERATED_SLOTS) throw new Error(`Takeaway schedule exceeds the technical limit of ${MAX_GENERATED_SLOTS} pickup slots`);
  return { patch: cleanPatch, settings: merged };
}
