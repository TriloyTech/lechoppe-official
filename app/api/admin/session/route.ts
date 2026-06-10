import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "lechoppe_admin_auth";

export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: req.cookies.get(COOKIE_NAME)?.value === "1" });
}
