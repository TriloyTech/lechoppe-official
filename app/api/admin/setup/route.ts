// app/api/admin/setup/route.ts
// Setup endpoint — creates site_settings table and adds allergen columns to menu_items.
// Uses direct Supabase client insert/select to work without DDL RPC.
// Safe to call multiple times (idempotent via IF NOT EXISTS logic).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();
    if (passphrase !== process.env.ADMIN_PASSPHRASE) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const results: Record<string, string> = {};

    // ── 1. Add allergen columns via ALTER TABLE ────────────────────────────────
    // Try via rpc exec_migration if available
    const allergenSQL = `
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS has_allergens boolean DEFAULT false;
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens_text text DEFAULT '';
    `;

    const { error: e1 } = await supabase.rpc("exec_migration", { sql_text: allergenSQL });
    if (e1) {
      // Fallback: try pg_execute
      const { error: e2 } = await supabase.rpc("pg_execute", { query: allergenSQL });
      if (e2) {
        results.allergen_columns = `manual_required: ${allergenSQL.trim()}`;
      } else {
        results.allergen_columns = "ok";
      }
    } else {
      results.allergen_columns = "ok";
    }

    const offersSQL = `ALTER TABLE offers ADD COLUMN IF NOT EXISTS valid_until timestamptz;`;
    const { error: oe1 } = await supabase.rpc("exec_migration", { sql_text: offersSQL });
    if (oe1) await supabase.rpc("pg_execute", { query: offersSQL });

    // ── 2. Create site_settings table ─────────────────────────────────────────
    const settingsSQL = `
      CREATE TABLE IF NOT EXISTS site_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL DEFAULT 'null',
        updated_at timestamptz DEFAULT now()
      );
      ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Public read" ON site_settings;
      CREATE POLICY "Public read" ON site_settings FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Service write" ON site_settings;
      CREATE POLICY "Service write" ON site_settings FOR ALL USING (true);
    `;

    const { error: e3 } = await supabase.rpc("exec_migration", { sql_text: settingsSQL });
    if (e3) {
      const { error: e4 } = await supabase.rpc("pg_execute", { query: settingsSQL });
      if (e4) {
        // Try a lightweight check — attempt to insert a test row
        const { error: e5 } = await supabase
          .from("site_settings")
          .upsert({ key: "_ping", value: "ok" }, { onConflict: "key" });
        results.site_settings = e5 ? `manual_required: ${settingsSQL.trim()}` : "ok";
      } else {
        results.site_settings = "ok";
      }
    } else {
      results.site_settings = "ok";
    }

    // ── 3. Seed default categories if not already set ─────────────────────────
    const { data: existing } = await supabase
      .from("site_settings")
      .select("key")
      .eq("key", "categories")
      .maybeSingle();

    if (!existing) {
      const defaultCategories = [
        { key: "burger",  emoji: "🍔", fr: "Burgers & Plats",   en: "Burgers & Mains" },
        { key: "side",    emoji: "🥗", fr: "Entrées & Accompagnements", en: "Starters & Sides" },
        { key: "dessert", emoji: "🍮", fr: "Desserts",           en: "Desserts" },
        { key: "drink",   emoji: "🥂", fr: "Boissons",          en: "Drinks" },
      ];
      await supabase
        .from("site_settings")
        .upsert({ key: "categories", value: defaultCategories }, { onConflict: "key" });
      results.categories_seeded = "ok";
    } else {
      results.categories_seeded = "already exists";
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
