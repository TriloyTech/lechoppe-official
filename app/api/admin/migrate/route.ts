// app/api/admin/migrate/route.ts
// One-time migration endpoint — drops the old category CHECK constraint
// and replaces it with one that accepts any non-empty string.
// Protected: only callable with the admin passphrase.

import { NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyAdminPassphrase } from "@/lib/admin/auth";

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
const takeawayLocalizationBody = stripMigrationTransaction(readFileSync(join(process.cwd(), "db/init/003_takeaway_category_localization.sql"), "utf8"));
const takeawayReviewFixesBody = stripMigrationTransaction(readFileSync(join(process.cwd(), "db/init/004_takeaway_review_fixes.sql"), "utf8"));

export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();
    if (!verifyAdminPassphrase(passphrase)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
        ALTER TABLE menu_items
          ADD COLUMN IF NOT EXISTS chef_suggestion boolean DEFAULT false;
        ALTER TABLE menu_items
          ADD CONSTRAINT menu_items_category_check
          CHECK (length(trim(category)) > 0);
      `);
      await client.query(takeawayMigrationBody);
      await client.query(takeawayLocalizationBody);
      await client.query(takeawayReviewFixesBody);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: "Core and Takeaway migrations complete",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
