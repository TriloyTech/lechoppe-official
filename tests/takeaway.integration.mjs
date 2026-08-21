import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
const schema = `takeaway_test_${randomBytes(6).toString("hex")}`;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let database;

try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  database = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
  for (const file of ["001_init.sql", "002_takeaway.sql", "003_takeaway_category_localization.sql", "004_takeaway_review_fixes.sql"]) await database.query(await readFile(new URL(`../db/init/${file}`, import.meta.url), "utf8"));

  const settings = await database.query("SELECT value FROM site_settings WHERE key='takeaway_settings'");
  assert.equal(settings.rows[0].value.takeaway_enabled, false); assert.equal("takeaway_promo_eligible" in settings.rows[0].value, false);
  await database.query("UPDATE site_settings SET value=(SELECT jsonb_agg(CASE WHEN c->>'key'='burger' THEN jsonb_set(c,'{es}',to_jsonb(c->>'fr')) ELSE c END) FROM jsonb_array_elements(value) c) WHERE key='categories'");
  await database.query(await readFile(new URL("../db/init/003_takeaway_category_localization.sql", import.meta.url), "utf8"));
  const localization = await database.query("SELECT c->>'es' es,c->>'fr' fr FROM site_settings, jsonb_array_elements(value) c WHERE key='categories' AND c->>'key'='burger'"); assert.equal(localization.rows[0].es, localization.rows[0].fr);

  const item = await database.query("INSERT INTO menu_items(name,price,category,available,takeaway_available,vat_rate) VALUES ('Concurrency item',10,'burger',true,true,10) RETURNING id");
  const pickup = new Date(Date.now() + 24 * 60 * 60_000); const pickupIso = pickup.toISOString();
  const place = async (suffix) => { const client = await database.connect(); try { await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`takeaway_slot:${pickupIso}`]); const count = await client.query("SELECT count(*)::int count FROM takeaway_orders WHERE pickup_time=$1 AND status<>'CANCELLED'", [pickup]); if (count.rows[0].count >= 1) { await client.query("ROLLBACK"); return false; } await client.query("INSERT INTO takeaway_orders(order_reference,tracking_token_hash,customer_name,customer_email,customer_phone,pickup_time_type,pickup_time,subtotal_ttc,final_total_ttc,order_snapshot) VALUES($1,$2,'Test','test@example.com','0612345678','scheduled',$3,10,10,$4::jsonb)", [`ECH-${suffix}`, createHash("sha256").update(`token-${suffix}`).digest("hex"), pickup, JSON.stringify({ items: [{ item_id: item.rows[0].id }] })]); await client.query("COMMIT"); return true; } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); } };
  const results = await Promise.all([place("AAAAA"), place("BBBBB")]); assert.deepEqual(results.sort(), [false, true]);
  const stored = await database.query("SELECT count(*)::int count FROM takeaway_orders WHERE pickup_time=$1", [pickup]); assert.equal(stored.rows[0].count, 1);
  console.log("integration PASS: migrations, idempotent localization, safe defaults, advisory-lock capacity");
} finally {
  await database?.end(); await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end(); console.log(`temporary schema ${schema} removed`);
}
