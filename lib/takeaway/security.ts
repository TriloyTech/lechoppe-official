import crypto from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const MAX_REFERENCE_ATTEMPTS = 10;

export function generateCandidateReference() {
  const bytes = crypto.randomBytes(5);
  return `ECH-${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("")}`;
}

export function generateTrackingToken() { return crypto.randomBytes(32).toString("hex"); }
export function hashTrackingToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }
export function isTrackingToken(token: string) { return /^[0-9a-f]{64}$/.test(token); }

const BOT_CHALLENGE_TTL_MS = 10 * 60_000;
const usedBotChallenges = new Map<string, number>();
type BotPayload = { v: 1; id: string; a: number; b: number; op: "+" | "-" | "*"; issuedAt: number };

function getBotSecret() {
  const configured = process.env.BOT_CHECK_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return null;
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSPHRASE || "lechoppe-bot-dev-2026";
}

function signBotPayload(encoded: string, secret: string) { return crypto.createHmac("sha256", secret).update(encoded).digest("base64url"); }
function expectedAnswer(payload: BotPayload) { return payload.op === "+" ? payload.a + payload.b : payload.op === "-" ? payload.a - payload.b : payload.a * payload.b; }
function pruneUsedChallenges(now: number) { for (const [id, expiresAt] of usedBotChallenges) if (expiresAt <= now) usedBotChallenges.delete(id); }

export function createBotChallenge(now = Date.now()) {
  const secret = getBotSecret();
  if (!secret) throw new Error("Bot verification is not configured");
  const operation = ["+", "-", "*"][crypto.randomInt(0, 3)] as BotPayload["op"];
  const b = crypto.randomInt(1, operation === "-" ? 6 : 10);
  const a = operation === "-" ? crypto.randomInt(b, 15) : crypto.randomInt(1, operation === "*" ? 6 : 10);
  const payload: BotPayload = { v: 1, id: crypto.randomBytes(16).toString("hex"), a, b, op: operation, issuedAt: now };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { question: `${a} ${operation === "*" ? "×" : operation === "-" ? "−" : "+"} ${b}`, challenge: `${encoded}.${signBotPayload(encoded, secret)}`, expires_in_seconds: BOT_CHALLENGE_TTL_MS / 1000 };
}

export function verifyBotChallenge(challenge: unknown, answer: unknown, options: { now?: number; consume?: boolean } = {}) {
  const secret = getBotSecret(); const now = options.now ?? Date.now();
  if (!secret || typeof challenge !== "string" || challenge.length > 1_000 || (typeof answer !== "number" && typeof answer !== "string")) return { valid: false, reason: "invalid" as const };
  const [encoded, suppliedSignature, extra] = challenge.split(".");
  if (!encoded || !suppliedSignature || extra) return { valid: false, reason: "invalid" as const };
  const expectedSignature = signBotPayload(encoded, secret);
  const supplied = Buffer.from(suppliedSignature); const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return { valid: false, reason: "tampered" as const };
  let payload: BotPayload;
  try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); } catch { return { valid: false, reason: "invalid" as const }; }
  if (payload.v !== 1 || !/^[0-9a-f]{32}$/.test(payload.id) || !["+", "-", "*"].includes(payload.op) || !Number.isInteger(payload.a) || !Number.isInteger(payload.b) || !Number.isInteger(payload.issuedAt)) return { valid: false, reason: "invalid" as const };
  const age = now - payload.issuedAt;
  if (age < 0 || age > BOT_CHALLENGE_TTL_MS) return { valid: false, reason: "expired" as const };
  if (Number(answer) !== expectedAnswer(payload)) return { valid: false, reason: "answer" as const };
  pruneUsedChallenges(now);
  if (usedBotChallenges.has(payload.id)) return { valid: false, reason: "replayed" as const };
  if (options.consume !== false) { usedBotChallenges.set(payload.id, payload.issuedAt + BOT_CHALLENGE_TTL_MS); while (usedBotChallenges.size > 10_000) usedBotChallenges.delete(usedBotChallenges.keys().next().value!); }
  return { valid: true, challengeId: payload.id } as const;
}
