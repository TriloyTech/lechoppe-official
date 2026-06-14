// app/api/admin/migrate/route.ts
// One-time migration endpoint — drops the old category CHECK constraint
// and replaces it with one that accepts any non-empty string.
// Protected: only callable with the admin passphrase.

import { NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";

export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();
    if (passphrase !== process.env.ADMIN_PASSPHRASE) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run migrations using direct PG client queries
    await pool.query(`
      ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
      ALTER TABLE menu_items 
        ADD COLUMN IF NOT EXISTS chef_suggestion boolean DEFAULT false;
      ALTER TABLE menu_items 
        ADD CONSTRAINT menu_items_category_check 
        CHECK (length(trim(category)) > 0);
    `);

    return NextResponse.json({ success: true, message: "Migration complete" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
