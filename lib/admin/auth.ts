import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "lechoppe_admin_auth";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

export function getAdminPassphrase() { return process.env.ADMIN_PASSPHRASE || (process.env.NODE_ENV === "production" ? null : "lechoppe-admin-2026"); }
export function verifyAdminPassphrase(value: unknown) { const configured = getAdminPassphrase(); if (!configured) return false; const supplied = Buffer.from(String(value ?? "")); const expected = Buffer.from(configured); return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected); }
function getSessionSecret() { return process.env.ADMIN_SESSION_SECRET || getAdminPassphrase(); }
function signature(payload: string, secret: string) { return crypto.createHmac("sha256", secret).update(payload).digest("hex"); }
export function createAdminSessionToken() { const secret = getSessionSecret(); if (!secret) throw new Error("Admin authentication is not configured"); const payload = `${Date.now()}.${crypto.randomBytes(16).toString("hex")}`; return `${payload}.${signature(payload, secret)}`; }
export function verifyAdminSessionToken(token: string | undefined) { const secret = getSessionSecret(); if (!secret || !token) return false; const parts = token.split("."); if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) return false; const payload = `${parts[0]}.${parts[1]}`; const expected = signature(payload, secret); if (!crypto.timingSafeEqual(Buffer.from(parts[2], "hex"), Buffer.from(expected, "hex"))) return false; const age = Date.now() - Number(parts[0]); return age >= 0 && age <= ADMIN_SESSION_MAX_AGE * 1000; }
export function isAdminRequest(request: NextRequest) { return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value); }
