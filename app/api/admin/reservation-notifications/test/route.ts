import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { guard, failure } from "@/lib/reservations/admin";
import { SETTING_KEY } from "@/lib/reservations/service";
import { renderReservationTest, sendReservationEmail } from "@/lib/email/reservation";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const sixtySecAgo = new Date(now.getTime() - 60_000).toISOString();

    const { data: limitCheck } = await supabase
      .from("reservation_notification_test_limits")
      .select("last_attempt_at")
      .eq("key", "test")
      .maybeSingle();

    if (limitCheck && new Date(limitCheck.last_attempt_at) > new Date(sixtySecAgo)) {
      throw new Error("rate_limited");
    }

    await supabase
      .from("reservation_notification_test_limits")
      .upsert({ key: "test", last_attempt_at: now.toISOString() }, { onConflict: "key" });

    const result = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle();

    const recipient = result.data?.value?.recipient;
    if (!recipient) throw new Error("invalid_recipient_missing");

    const id = await sendReservationEmail(
      recipient,
      renderReservationTest(),
      `reservation-test/${randomUUID()}`
    );
    return NextResponse.json({ accepted: true, providerMessageId: id });
  } catch (e) {
    return failure(e);
  }
}
