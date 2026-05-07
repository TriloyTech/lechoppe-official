import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Token validation ─────────────────────────────────────────────────────────
// Token format: base64(answer:timestamp:nonce)
function validateToken(token: string): { valid: boolean; reason?: string } {
  try {
    const decoded = atob(token);
    const [answerStr, tsStr] = decoded.split(":");
    const answer = parseInt(answerStr, 10);
    const ts     = parseInt(tsStr, 10);

    if (isNaN(answer) || isNaN(ts)) return { valid: false, reason: "malformed_token" };

    // Token must be < 10 minutes old
    const age = Date.now() - ts;
    if (age > 10 * 60 * 1000) return { valid: false, reason: "token_expired" };
    if (age < -300000)        return { valid: false, reason: "token_future" }; // Allow 5min clock skew

    return { valid: true };
  } catch {
    return { valid: false, reason: "decode_error" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Layer 1: Honeypot ──────────────────────────────────────────────────
    // If the hidden "website" field is filled → bot
    if (body.website && body.website.trim() !== "") {
      // Silently accept (don't tell bots they were caught)
      return NextResponse.json({ success: true });
    }

    // ── Layer 2: Timing check ──────────────────────────────────────────────
    // form_started is set when the reservation section mounts
    const elapsed = Date.now() - (body.form_started ?? 0);
    if (elapsed < 2000) {
      return NextResponse.json({ error: "Submission too fast. Please try again." }, { status: 429 });
    }

    // ── Layer 3: CAPTCHA token ─────────────────────────────────────────────
    if (!body.captcha_token) {
      return NextResponse.json({ error: "Bot check required." }, { status: 400 });
    }
    const { valid, reason } = validateToken(body.captcha_token);
    if (!valid) {
      return NextResponse.json(
        { error: reason === "token_expired" ? "Bot check expired. Please refresh and try again." : "Invalid bot check." },
        { status: 400 }
      );
    }

    // ── Validate required fields ───────────────────────────────────────────
    const { name, email, party_size, date, time } = body;
    if (!name || !email || !date || !time) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (party_size < 1 || party_size > 100) {
      return NextResponse.json({ error: "Invalid party size." }, { status: 400 });
    }

    // ── Rate limit: max 3 reservations from same email per day ────────────
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("email", email.trim().toLowerCase())
      .gte("created_at", `${today}T00:00:00Z`);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Too many reservations from this email today. Please call us instead." },
        { status: 429 }
      );
    }

    // ── Insert ─────────────────────────────────────────────────────────────
    const { error } = await supabase.from("reservations").insert({
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
      phone:      body.phone?.trim() || null,
      party_size: parseInt(String(party_size), 10),
      date,
      time,
      notes:      body.notes?.trim() || null,
      status:     "pending",
    });

    if (error) {
      console.error("[reservations] Supabase error:", error);
      return NextResponse.json({ error: "Failed to save reservation." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reservations] Unexpected:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
