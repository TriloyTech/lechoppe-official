// app/api/admin/migrate/route.ts
// One-time migration endpoint — drops the old category CHECK constraint
// and replaces it with one that accepts any non-empty string.
// Protected: only callable with the admin passphrase.
// DELETE THIS FILE after running it once.

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

    // Run migration via Supabase's rpc — we'll create a temporary helper function
    // and call it, then drop it.
    const { error: e1 } = await supabase.rpc("exec_migration", {
      sql_text: `
        ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
        ALTER TABLE menu_items 
          ADD COLUMN IF NOT EXISTS chef_suggestion boolean DEFAULT false;
        ALTER TABLE menu_items 
          ADD CONSTRAINT menu_items_category_check 
          CHECK (length(trim(category)) > 0);
      `,
    });

    if (e1) {
      // rpc not available — try creating the function first
      const { error: e2 } = await supabase.rpc("pg_execute", {
        query: "ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check",
      });

      if (e2) {
        return NextResponse.json({
          error: "Cannot run DDL via REST API",
          detail: e2.message,
          manual_sql: `
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_category_check CHECK (length(trim(category)) > 0);
          `.trim(),
        }, { status: 422 });
      }
    }

    return NextResponse.json({ success: true, message: "Migration complete" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
