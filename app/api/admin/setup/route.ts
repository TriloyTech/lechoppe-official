import { NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";

const setupSQL = `
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS has_allergens boolean DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens_text text DEFAULT '';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS takeaway_available boolean DEFAULT true;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS valid_until date;
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz DEFAULT now()
);
`;

export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();
    if (passphrase !== process.env.ADMIN_PASSPHRASE) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await pool.query(setupSQL);

    const defaultCategories = [
      { key: "burger", emoji: "🍔", fr: "Burgers & Plats", en: "Burgers & Mains" },
      { key: "side", emoji: "🥗", fr: "Entrées & Accompagnements", en: "Starters & Sides" },
      { key: "dessert", emoji: "🍮", fr: "Desserts", en: "Desserts" },
      { key: "drink", emoji: "🥂", fr: "Boissons", en: "Drinks" },
    ];

    await pool.query(
      `INSERT INTO site_settings (key, value) VALUES ('categories', $1::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(defaultCategories)],
    );

    return NextResponse.json({ success: true, results: { postgres_setup: "ok", categories_seeded: "ok" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
