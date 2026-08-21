import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { DEFAULT_TAKEAWAY_SETTINGS, type PaymentMethod, type TakeawaySettings } from "@/lib/takeaway/types";

const COOKIE_NAME = "lechoppe_admin_auth";
const PAYMENT_METHODS = new Set<PaymentMethod>(["cash", "card", "ticket_restaurant", "other"]);
const NUMERIC_KEYS = ["closing_cutoff_minutes", "prep_lead_time_minutes", "slot_interval_minutes", "advance_order_max_days", "max_orders_per_slot", "min_order_amount", "max_order_amount"] as const;

function isAuthed(request: NextRequest) { return request.cookies.get(COOKIE_NAME)?.value === "1"; }

function validatePatch(input: unknown): Partial<TakeawaySettings> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid settings payload");
  const body = input as Record<string, unknown>;
  const allowed = new Set([...NUMERIC_KEYS, "takeaway_enabled", "pause_mode", "operating_hours", "audio_alert_enabled", "accepted_payment_methods"]);
  if (Object.keys(body).some((key) => !allowed.has(key as never))) throw new Error("Unknown settings field");
  for (const key of ["takeaway_enabled", "pause_mode", "audio_alert_enabled"] as const) {
    if (key in body && typeof body[key] !== "boolean") throw new Error(`${key} must be boolean`);
  }
  for (const key of NUMERIC_KEYS) {
    if (key in body && (typeof body[key] !== "number" || !Number.isFinite(body[key]) || (body[key] as number) < 0)) throw new Error(`${key} must be non-negative`);
  }
  if ("slot_interval_minutes" in body && (body.slot_interval_minutes as number) < 1) throw new Error("slot_interval_minutes must be at least 1");
  if ("accepted_payment_methods" in body && (!Array.isArray(body.accepted_payment_methods) || body.accepted_payment_methods.length === 0 || body.accepted_payment_methods.some((value) => !PAYMENT_METHODS.has(value as PaymentMethod)))) throw new Error("Invalid accepted payment methods");
  if ("operating_hours" in body && (!body.operating_hours || typeof body.operating_hours !== "object" || Array.isArray(body.operating_hours))) throw new Error("Invalid operating hours");
  return body as Partial<TakeawaySettings>;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await pool.query("SELECT value FROM site_settings WHERE key = $1", ["takeaway_settings"]);
  return NextResponse.json({ settings: { ...DEFAULT_TAKEAWAY_SETTINGS, ...(result.rows[0]?.value ?? {}) } });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const patch = validatePatch(await request.json());
    const result = await pool.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = site_settings.value || EXCLUDED.value, updated_at = now()
       RETURNING value`,
      ["takeaway_settings", JSON.stringify(patch)],
    );
    return NextResponse.json({ settings: { ...DEFAULT_TAKEAWAY_SETTINGS, ...result.rows[0].value } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
