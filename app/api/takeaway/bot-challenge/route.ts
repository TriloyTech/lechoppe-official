import { NextRequest, NextResponse } from "next/server";
import { createBotChallenge } from "@/lib/takeaway/security";
import { BoundedRateLimiter, requestRateLimitKey } from "@/lib/takeaway/rateLimit";

const limiter = new BoundedRateLimiter(5_000);

export async function GET(request: NextRequest) {
  const key = requestRateLimitKey(request.headers); const rate = limiter.consume(key, key === "network:untrusted-proxy" ? 5_000 : 60, 10 * 60_000);
  if (rate.limited) return NextResponse.json({ error: "Too many challenges" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  try { return NextResponse.json(createBotChallenge(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Bot verification unavailable" }, { status: 503 }); }
}
