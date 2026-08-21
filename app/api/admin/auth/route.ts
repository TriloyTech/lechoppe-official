import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE, createAdminSessionToken, getAdminPassphrase, verifyAdminPassphrase } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  try {
    const { passphrase } = await req.json();

    const configuredPassphrase = getAdminPassphrase();
    if (!configuredPassphrase) return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
    if (!verifyAdminPassphrase(passphrase)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   ADMIN_SESSION_MAX_AGE,
      path:     "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
