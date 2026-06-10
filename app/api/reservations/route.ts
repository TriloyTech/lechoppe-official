import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";

// Token format: base64(answer:timestamp:nonce)
function validateToken(token: string): { valid: boolean; reason?: string } {
  try {
    const decoded = atob(token);
    const [answerStr, tsStr] = decoded.split(":");
    const answer = parseInt(answerStr, 10);
    const ts = parseInt(tsStr, 10);
    if (isNaN(answer) || isNaN(ts)) return { valid: false, reason: "malformed_token" };
    const age = Date.now() - ts;
    if (age > 10 * 60 * 1000) return { valid: false, reason: "token_expired" };
    if (age < -300000) return { valid: false, reason: "token_future" };
    return { valid: true };
  } catch {
    return { valid: false, reason: "decode_error" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const elapsed = Date.now() - (body.form_started ?? 0);
    if (elapsed < 2000) {
      return NextResponse.json({ error: "Submission too fast. Please try again." }, { status: 429 });
    }

    if (!body.captcha_token) {
      return NextResponse.json({ error: "Bot check required." }, { status: 400 });
    }
    const { valid, reason } = validateToken(body.captcha_token);
    if (!valid) {
      return NextResponse.json(
        { error: reason === "token_expired" ? "Bot check expired. Please refresh and try again." : "Invalid bot check." },
        { status: 400 },
      );
    }

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

    const normalizedEmail = email.trim().toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM reservations WHERE email = $1 AND created_at >= $2::timestamptz`,
      [normalizedEmail, `${today}T00:00:00Z`],
    );

    if ((countRes.rows[0]?.count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Too many reservations from this email today. Please call us instead." },
        { status: 429 },
      );
    }

    await pool.query(
      `INSERT INTO reservations (name, email, phone, party_size, date, time, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
      [
        name.trim(),
        normalizedEmail,
        body.phone?.trim() || null,
        parseInt(String(party_size), 10),
        date,
        time,
        body.notes?.trim() || null,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reservations] Unexpected:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
