import type { NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
export function isAdmin(request: NextRequest) { return isAdminRequest(request); }
