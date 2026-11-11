import { NextRequest, NextResponse } from "next/server";
import { guard, failure } from "@/lib/reservations/admin";
import { emailAddress } from "@/lib/reservations/model";
import { SETTING_KEY } from "@/lib/reservations/service";
import { providerConfigured } from "@/lib/email/reservation";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const supabase = createAdminClient();
    const [settingsResult, notificationsResult] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", SETTING_KEY).maybeSingle(),
      supabase
        .from("reservation_notifications")
        .select("id, event_id, audience, status, attempts, last_error, provider_message_id, next_attempt_at, recipient, first_attempt_at, created_at, reservation_events(reservation_id, kind)")
        .or("status.in.(blocked,failed),last_error.not.is.null")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const cutoff = Date.now() - 23 * 3600 * 1000;
    const problems = (notificationsResult.data || []).map((n: any) => {
      const firstAttempt = n.first_attempt_at ? new Date(n.first_attempt_at).getTime() : null;
      const retryable =
        Boolean(n.recipient) &&
        ["blocked", "failed"].includes(n.status) &&
        (n.attempts || 0) < 6 &&
        (!firstAttempt || firstAttempt > cutoff) &&
        n.last_error !== "site_url_missing";

      return {
        id: n.id,
        reservation_id: n.reservation_events?.reservation_id,
        kind: n.reservation_events?.kind,
        audience: n.audience,
        status: n.status,
        attempts: n.attempts,
        last_error: n.last_error,
        provider_message_id: n.provider_message_id,
        next_attempt_at: n.next_attempt_at,
        retryable,
      };
    });

    return NextResponse.json(
      {
        recipient: settingsResult.data?.value?.recipient || "",
        providerConfigured: providerConfigured(),
        siteUrlConfigured: Boolean(process.env.SITE_URL),
        problems,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return failure(e);
  }
}

export async function PUT(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const recipient = body.recipient === "" ? "" : emailAddress(body.recipient);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: SETTING_KEY, value: { recipient } }, { onConflict: "key" });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch (e) {
    return failure(e);
  }
}
