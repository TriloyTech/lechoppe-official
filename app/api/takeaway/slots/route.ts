import { NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { DEFAULT_TAKEAWAY_SETTINGS, type TakeawaySettings } from "@/lib/takeaway/types";
import { generateSlots } from "@/lib/takeaway/slots";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settingsResult = await pool.query("SELECT value FROM site_settings WHERE key = $1", ["takeaway_settings"]);
    const settings: TakeawaySettings = { ...DEFAULT_TAKEAWAY_SETTINGS, ...(settingsResult.rows[0]?.value ?? {}) };
    if (!settings.takeaway_enabled || settings.pause_mode) return NextResponse.json({ slots: [] });
    const slots = generateSlots(settings);
    const counts = slots.length ? await pool.query(`SELECT pickup_time, count(*)::int AS count FROM takeaway_orders WHERE pickup_time = ANY($1::timestamptz[]) AND status <> 'CANCELLED' GROUP BY pickup_time`, [slots]) : { rows: [] };
    const byTime = new Map(counts.rows.map((row) => [new Date(row.pickup_time).toISOString(), row.count]));
    return NextResponse.json({ slots: slots.map((slot, index) => ({ value: slot.toISOString(), type: index === 0 ? "asap" : "scheduled", available: settings.max_orders_per_slot === 0 || (byTime.get(slot.toISOString()) ?? 0) < settings.max_orders_per_slot })) });
  } catch { return NextResponse.json({ slots: [] }, { status: 503 }); }
}
