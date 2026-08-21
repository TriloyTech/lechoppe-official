import { TECHNICAL_MAX_ITEM_QUANTITY, TECHNICAL_MAX_ORDER_QUANTITY, type CreateOrderPayload } from "./types.ts";
import { verifyBotChallenge } from "./security.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^(?:\+\d{8,15}|0[67](?:[ .-]?\d{2}){4})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_LINE_QUANTITY = TECHNICAL_MAX_ITEM_QUANTITY;
export const MAX_TOTAL_QUANTITY = TECHNICAL_MAX_ORDER_QUANTITY;

export function normalizeCustomerPhone(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/[ .-]/g, "");
  if (!PHONE.test(normalized)) throw new Error("Invalid phone");
  return normalized;
}

export function customerContactRateLimitIdentity(email: unknown, phone: unknown) {
  return `${String(email ?? "").trim().toLowerCase()}|${normalizeCustomerPhone(phone)}`;
}

export function parseOrderPayload(input: unknown): CreateOrderPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid payload");
  const body = input as CreateOrderPayload;
  if (body.website) throw new Error("Invalid submission");
  if (!verifyBotChallenge(body.bot_token, body.bot_answer).valid) throw new Error("Bot verification required");
  body.customer_name = String(body.customer_name ?? "").trim(); body.customer_email = String(body.customer_email ?? "").trim().toLowerCase(); body.customer_phone = normalizeCustomerPhone(body.customer_phone); body.customer_notes = String(body.customer_notes ?? "").trim();
  if (body.customer_name.length < 2 || body.customer_name.length > 100) throw new Error("Invalid customer name");
  if (!EMAIL.test(body.customer_email) || body.customer_email.length > 254) throw new Error("Invalid email");
  if ((body.customer_notes?.length ?? 0) > 500) throw new Error("Notes are too long");
  if (!(["fr", "en", "es", "it"] as string[]).includes(body.lang)) throw new Error("Invalid language");
  if (!(["asap", "scheduled"] as string[]).includes(body.pickup_time_type) || !Number.isFinite(Date.parse(body.pickup_time))) throw new Error("Invalid pickup time");
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new Error("Invalid items");
  for (const line of body.items) { if (!UUID.test(line.item_id) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY || !Array.isArray(line.choice_ids) || line.choice_ids.length > 30 || new Set(line.choice_ids).size !== line.choice_ids.length || line.choice_ids.some((id) => !UUID.test(id)) || String(line.special_instructions ?? "").length > 300) throw new Error("Invalid order line"); }
  if (body.items.reduce((sum, line) => sum + line.quantity, 0) > MAX_TOTAL_QUANTITY) throw new Error("Order quantity is too large");
  body.promo_code = String(body.promo_code ?? "").trim().toUpperCase().slice(0, 50) || undefined;
  return body;
}
