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
