import { NextRequest, NextResponse } from "next/server";
import { workOne } from "@/lib/reservations/worker";
import { logServerError } from "@/lib/server/logError";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_WORKER_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const headerSecret = req.headers.get("x-worker-secret");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return headerSecret === secret || bearerToken === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let processed = 0;
    // Bounded execution: process up to 10 queued jobs per invocation
    while (await workOne()) {
      processed++;
      if (processed >= 10) break;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    logServerError("internal.reservations.dispatch", err);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
