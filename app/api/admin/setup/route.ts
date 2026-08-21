import { NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const takeawayMigrationSQL = readFileSync(
  join(process.cwd(), "db/init/002_takeaway.sql"),
  "utf8",
);

function stripMigrationTransaction(sql: string) {
  const beginMarker = "\nBEGIN;";
  const commitMarker = "\nCOMMIT;";
  const beginIndex = sql.indexOf(beginMarker);
  const commitIndex = sql.lastIndexOf(commitMarker);
  if (beginIndex < 0 || commitIndex <= beginIndex || sql.slice(commitIndex + commitMarker.length).trim()) {
    throw new Error("Takeaway migration must have explicit transaction boundaries");
  }
  return `${sql.slice(0, beginIndex)}\n${sql.slice(beginIndex + beginMarker.length, commitIndex)}`.trim();
}

const takeawayMigrationBody = stripMigrationTransaction(takeawayMigrationSQL);

const setupSQL = `
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS has_allergens boolean DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens_text text DEFAULT '';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS takeaway_available boolean DEFAULT false;
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

    const defaultCategories = [
      { key: "burger", emoji: "🍔", fr: "Burgers & Plats", en: "Burgers & Mains" },
      { key: "side", emoji: "🥗", fr: "Entrées & Accompagnements", en: "Starters & Sides" },
      { key: "dessert", emoji: "🍮", fr: "Desserts", en: "Desserts" },
      { key: "drink", emoji: "🥂", fr: "Boissons", en: "Drinks" },
    ];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(setupSQL);
      await client.query(
        `INSERT INTO site_settings (key, value) VALUES ('categories', $1::jsonb)
         ON CONFLICT (key) DO NOTHING`,
        [JSON.stringify(defaultCategories)],
      );
      await client.query(takeawayMigrationBody);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      results: {
        postgres_setup: "ok",
        categories_seeded: "ok",
        takeaway_migration: "ok",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
