import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { isAdminRequest } from "@/lib/admin/auth";
import { mergeAndValidateTakeawaySettings, sanitizeTakeawaySettings } from "@/lib/takeaway/settings";

const isAuthed = isAdminRequest;

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await pool.query("SELECT value FROM site_settings WHERE key = $1", ["takeaway_settings"]);
  return NextResponse.json({ settings: sanitizeTakeawaySettings(result.rows[0]?.value) });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = await request.json();
    const existing = await pool.query("SELECT value FROM site_settings WHERE key = $1", ["takeaway_settings"]);
    const { settings } = mergeAndValidateTakeawaySettings(existing.rows[0]?.value, input);
    const result = await pool.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
       RETURNING value`,
      ["takeaway_settings", JSON.stringify(settings)],
    );
    return NextResponse.json({ settings: sanitizeTakeawaySettings(result.rows[0].value) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
