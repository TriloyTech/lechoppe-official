import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { verifyBotChallenge } from "@/lib/takeaway/security";

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
    if (!verifyBotChallenge(body.captcha_token, body.captcha_answer).valid) return NextResponse.json({ error: "Invalid or expired bot check." }, { status: 400 });

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
