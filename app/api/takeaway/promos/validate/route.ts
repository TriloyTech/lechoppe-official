import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { BoundedRateLimiter, requestRateLimitKey } from "@/lib/takeaway/rateLimit";
import { normalizePromoCode, validatePromotionRecord } from "@/lib/takeaway/promotions";

const limiter = new BoundedRateLimiter(5_000);

export async function POST(request: NextRequest) {
  const rate = limiter.consume(`promo:${requestRateLimitKey(request.headers)}`, 20, 10 * 60_000);
  if (rate.limited) {
    return NextResponse.json(
      { valid: false, reason: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let code = "";
  try {
    code = normalizePromoCode((await request.json()).promo_code);
  } catch {
    return NextResponse.json({ valid: false, reason: "INVALID" }, { status: 400 });
  }
  if (!code) return NextResponse.json({ valid: false, reason: "INVALID" }, { status: 400 });

  const result = await pool.query(
    "SELECT code, discount, active, takeaway_eligible, valid_until FROM offers WHERE upper(code) = $1 LIMIT 1",
    [code],
  );
  const validation = validatePromotionRecord(result.rows[0]);
  return NextResponse.json(validation, { status: validation.valid ? 200 : 400 });
}
