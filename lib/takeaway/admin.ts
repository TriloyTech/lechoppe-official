import type { NextRequest } from "next/server";
export function isAdmin(request: NextRequest) { return request.cookies.get("lechoppe_admin_auth")?.value === "1"; }
