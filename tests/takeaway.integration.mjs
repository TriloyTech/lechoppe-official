import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
const schema = `takeaway_test_${randomBytes(6).toString("hex")}`;
const port = 41_000 + Math.floor(Math.random() * 1_000);
const origin = `http://127.0.0.1:${port}`;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const testUrl = new URL(process.env.DATABASE_URL);
testUrl.searchParams.set("options", `-c search_path=${schema},public`);
let database; let server; let serverLog = "";

const request = async (path, init = {}) => { const response = await fetch(`${origin}${path}`, init); const body = await response.json().catch(() => ({})); return { response, body }; };
const solve = (question) => { const [a, operation, b] = question.split(" "); return operation === "+" ? Number(a) + Number(b) : operation === "−" ? Number(a) - Number(b) : Number(a) * Number(b); };
const challenge = async () => { const result = await request("/api/takeaway/bot-challenge"); assert.equal(result.response.status, 200); return { bot_token: result.body.challenge, bot_answer: solve(result.body.question) }; };
const waitForServer = async () => { for (let attempt = 0; attempt < 120; attempt++) { try { const response = await fetch(`${origin}/api/takeaway/config`); if (response.status < 500) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error("Next integration server did not start"); };

try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  database = new pg.Pool({ connectionString: testUrl.toString() });
  for (const file of ["001_init.sql", "002_takeaway.sql", "003_takeaway_category_localization.sql", "004_takeaway_review_fixes.sql"]) await database.query(await readFile(new URL(`../db/init/${file}`, import.meta.url), "utf8"));
  await database.query(await readFile(new URL("../db/init/003_takeaway_category_localization.sql", import.meta.url), "utf8"));
  await database.query(await readFile(new URL("../db/init/004_takeaway_review_fixes.sql", import.meta.url), "utf8"));
  const storedSettings = await database.query("SELECT value FROM site_settings WHERE key='takeaway_settings'"); assert.equal(storedSettings.rows[0].value.takeaway_enabled, false); assert.equal("takeaway_promo_eligible" in storedSettings.rows[0].value, false);

  const everyDay = Object.fromEntries(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => [day, [{ open: "00:00", close: "23:59" }]]));
  const settings = { ...storedSettings.rows[0].value, takeaway_enabled: true, operating_hours: everyDay, closing_cutoff_minutes: 0, prep_lead_time_minutes: 0, slot_interval_minutes: 30, advance_order_max_days: 0, max_orders_per_slot: 1, accepted_payment_methods: ["cash", "card"] };
  await database.query("UPDATE site_settings SET value=$1::jsonb WHERE key='takeaway_settings'", [JSON.stringify(settings)]);
  const item = await database.query("INSERT INTO menu_items(name,price,category,available,takeaway_available,vat_rate) VALUES ('Endpoint item',10,'burger',true,true,10) RETURNING id");

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl.toString(), BOT_CHECK_SECRET: "integration-bot-secret", ADMIN_PASSPHRASE: "integration-admin", ADMIN_SESSION_SECRET: "integration-session-secret" }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (chunk) => { serverLog += chunk; }); server.stderr.on("data", (chunk) => { serverLog += chunk; });
  await waitForServer();

  for (const path of ["/", "/takeaway", `/takeaway?item=${item.rows[0].id}`, "/admin/login"]) { const response = await fetch(`${origin}${path}`); assert.equal(response.status, 200); assert.doesNotMatch(await response.text(), /Application error|Internal Server Error/); }
  const reservationBot = await challenge(); const reservation = await request("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Integration Guest", email: "reservation@example.com", phone: "0612345678", party_size: 2, date: "2026-12-01", time: "20:00", notes: "Window", website: "", form_started: Date.now() - 3_000, captcha_token: reservationBot.bot_token, captcha_answer: reservationBot.bot_answer }) }); assert.equal(reservation.response.status, 200);

  const unauthenticated = await request("/api/admin/takeaway/settings"); assert.equal(unauthenticated.response.status, 401);
  const login = await request("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase: "integration-admin" }) }); assert.equal(login.response.status, 200); const cookie = login.response.headers.get("set-cookie")?.split(";")[0]; assert.ok(cookie);
  const settingsGet = await request("/api/admin/takeaway/settings", { headers: { Cookie: cookie } }); assert.equal(settingsGet.response.status, 200);
  const settingsPatch = await request("/api/admin/takeaway/settings", { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ pause_mode: false }) }); assert.equal(settingsPatch.response.status, 200);
  const createdGroup = await request("/api/db/takeaway_option_groups", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ key: "integration_group", name: { fr: "Test", en: "Test", es: "Prueba", it: "Prova" }, selection_type: "single", is_required: false, min_selections: 0, max_selections: 1, is_active: true, display_order: 0 }) }); assert.equal(createdGroup.response.status, 200);
  const savedGroup = await request("/api/db/takeaway_option_groups", { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ values: { name: { fr: "Sauces", en: "Sauces", es: "Salsas", it: "Salse" } }, filters: [{ column: "id", op: "eq", value: createdGroup.body.data.id }] }) }); assert.equal(savedGroup.response.status, 200); assert.equal(savedGroup.body.data.length, 1);

  const listed = await request("/api/takeaway/slots"); const first = listed.body.slots.find((slot) => slot.type === "asap"); assert.ok(first?.available);
  const payload = async (suffix, pickupTime = first.value) => ({ customer_name: `Test ${suffix}`, customer_email: `test-${suffix}@example.com`, customer_phone: suffix === "a" ? "06 12 34 56 78" : "06-87-65-43-21", pickup_time_type: "asap", pickup_time: pickupTime, lang: "fr", website: "", items: [{ item_id: item.rows[0].id, choice_ids: [], special_instructions: "Sauce à part", quantity: 1 }], ...(await challenge()) });
  const [payloadA, payloadB] = await Promise.all([payload("a"), payload("b")]);
  const [firstOrder, secondOrder] = await Promise.all([request("/api/takeaway/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadA) }), request("/api/takeaway/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadB) })]);
  const results = [firstOrder, secondOrder]; assert.deepEqual(results.map((result) => result.response.status).sort(), [201, 409]); assert.match(results.find((result) => result.response.status === 409).body.error, /full/i);
  const stored = await database.query("SELECT count(*)::int count FROM takeaway_orders WHERE pickup_time=$1", [first.value]); assert.equal(stored.rows[0].count, 1);
  const afterCapacity = await request("/api/takeaway/slots"); assert.equal(afterCapacity.body.slots.find((slot) => slot.value === first.value).available, false); const nextAsap = afterCapacity.body.slots.find((slot) => slot.available); assert.equal(nextAsap.type, "asap");
  const cancellable = await request("/api/takeaway/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await payload("cancel", nextAsap.value)) }); assert.equal(cancellable.response.status, 201); const cancelToken = cancellable.body.tracking_url.split("/").pop(); assert.equal((await request(`/api/takeaway/orders/${cancelToken}/cancel`, { method: "POST" })).response.status, 200); assert.equal((await request(`/api/takeaway/orders/${cancelToken}/cancel`, { method: "POST" })).response.status, 409);

  const created = results.find((result) => result.response.status === 201).body; const token = created.tracking_url.split("/").pop();
  assert.equal((await request(`/api/takeaway/orders/${token}`)).response.status, 200); assert.equal((await request(`/api/takeaway/orders/${created.order_reference}`)).response.status, 404);
  const orderRow = await database.query("SELECT id,customer_phone FROM takeaway_orders WHERE order_reference=$1", [created.order_reference]); assert.match(orderRow.rows[0].customer_phone, /^(?:\+|\d)\d+$/);
  const beforeEdit = await database.query("SELECT pickup_time,staff_notes,order_snapshot FROM takeaway_orders WHERE id=$1", [orderRow.rows[0].id]); assert.equal(beforeEdit.rows[0].order_snapshot.items[0].special_instructions, "Sauce à part");
  assert.equal((await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/edit`, { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ staff_notes: "Priority" }) })).response.status, 200);
  const noteOnly = await database.query("SELECT pickup_time,staff_notes FROM takeaway_orders WHERE id=$1", [orderRow.rows[0].id]); assert.equal(new Date(noteOnly.rows[0].pickup_time).toISOString(), new Date(beforeEdit.rows[0].pickup_time).toISOString()); assert.equal(noteOnly.rows[0].staff_notes, "Priority");
  assert.equal((await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/edit`, { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ pickup_time: nextAsap.value }) })).response.status, 200);
  const pickupOnly = await database.query("SELECT pickup_time,staff_notes FROM takeaway_orders WHERE id=$1", [orderRow.rows[0].id]); assert.equal(new Date(pickupOnly.rows[0].pickup_time).toISOString(), nextAsap.value); assert.equal(pickupOnly.rows[0].staff_notes, "Priority");
  const feed = await request("/api/admin/takeaway/orders", { headers: { Cookie: cookie } }); const feedOrder = feed.body.orders.find((order) => order.id === orderRow.rows[0].id); assert.equal(feedOrder.order_snapshot.items[0].special_instructions, "Sauce à part"); assert.equal("tracking_token_hash" in feedOrder, false);
  const illegal = await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/status`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "READY" }) }); assert.equal(illegal.response.status, 409);
  const accepted = await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/status`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACCEPTED" }) }); assert.equal(accepted.response.status, 200);
  assert.equal((await request(`/api/takeaway/orders/${token}/cancel`, { method: "POST" })).response.status, 409);
  for (const status of ["PREPARING", "READY"]) assert.equal((await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/status`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status }) })).response.status, 200);
  assert.equal((await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/status`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) })).response.status, 409);
  assert.equal((await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/payment`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ payment_status: "PAID", payment_method: "cash" }) })).response.status, 200);
  assert.equal((await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/status`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) })).response.status, 200);
  assert.equal((await request(`/api/admin/takeaway/orders/${orderRow.rows[0].id}/payment`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ payment_status: "UNPAID" }) })).response.status, 409);
  console.log("integration PASS: real Next endpoints, auth/settings, concurrent order capacity, ASAP, tracking, cancellation, lifecycle, payment, migration reruns");
} catch (error) {
  if (server) console.error(serverLog);
  throw error;
} finally {
  if (server?.exitCode === null) { server.kill("SIGTERM"); await new Promise((resolve) => server.once("exit", resolve)); }
  await database?.end(); await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end(); console.log(`temporary schema ${schema} removed`);
}
