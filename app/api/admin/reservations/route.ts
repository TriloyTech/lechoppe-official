import { NextRequest, NextResponse } from "next/server";
import { guard, failure } from "@/lib/reservations/admin";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const supabase = createAdminClient();
    const [resResult, probResult] = await Promise.all([
      supabase
        .from("reservations")
        .select("id, created_at, name, email, phone, party_size, date, time, status, notes, lang")
        .order("date")
        .order("time"),
      supabase
        .from("reservation_notifications")
        .select("*", { count: "exact", head: true })
        .or("status.in.(blocked,failed),last_error.not.is.null"),
    ]);

    if (resResult.error) throw resResult.error;
    if (probResult.error) throw probResult.error;

    return NextResponse.json(
      {
        reservations: resResult.data || [],
        problems: probResult.count || 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return failure(e);
  }
}
