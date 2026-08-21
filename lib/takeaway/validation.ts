import type { CreateOrderPayload } from "./types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^(?:\+\d{8,15}|0[67](?:[ .-]?\d{2}){4})$/;

export function validateBotToken(token: unknown) {
  if (typeof token !== "string" || token.length > 200) return false;
  try { const [, timestamp] = Buffer.from(token, "base64").toString("utf8").split(":"); const age = Date.now() - Number(timestamp); return Number.isFinite(age) && age >= 0 && age < 10 * 60_000; } catch { return false; }
}

export function parseOrderPayload(input: unknown): CreateOrderPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid payload");
  const body = input as CreateOrderPayload;
  if (body.website) throw new Error("Invalid submission");
  if (!validateBotToken(body.bot_token)) throw new Error("Bot verification required");
  body.customer_name = String(body.customer_name ?? "").trim(); body.customer_email = String(body.customer_email ?? "").trim().toLowerCase(); body.customer_phone = String(body.customer_phone ?? "").trim(); body.customer_notes = String(body.customer_notes ?? "").trim();
  if (body.customer_name.length < 2 || body.customer_name.length > 100) throw new Error("Invalid customer name");
  if (!EMAIL.test(body.customer_email) || body.customer_email.length > 254) throw new Error("Invalid email");
  if (!PHONE.test(body.customer_phone.replace(/\s/g, ""))) throw new Error("Invalid phone");
  if ((body.customer_notes?.length ?? 0) > 500) throw new Error("Notes are too long");
  if (!(["fr", "en", "es", "it"] as string[]).includes(body.lang)) throw new Error("Invalid language");
  if (!(["asap", "scheduled"] as string[]).includes(body.pickup_time_type) || !Number.isFinite(Date.parse(body.pickup_time))) throw new Error("Invalid pickup time");
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new Error("Invalid items");
  for (const line of body.items) { if (!/^[0-9a-f-]{36}$/i.test(line.item_id) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100 || !Array.isArray(line.choice_ids) || line.choice_ids.length > 30 || new Set(line.choice_ids).size !== line.choice_ids.length || line.choice_ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id)) || String(line.special_instructions ?? "").length > 300) throw new Error("Invalid order line"); }
  body.promo_code = String(body.promo_code ?? "").trim().toUpperCase().slice(0, 50) || undefined;
  return body;
}
