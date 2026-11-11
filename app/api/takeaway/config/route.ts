import { NextResponse } from "next/server";
import { DEFAULT_TAKEAWAY_SETTINGS } from "@/lib/takeaway/types";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "takeaway_settings")
      .maybeSingle();

    const settings = { ...DEFAULT_TAKEAWAY_SETTINGS, ...(data?.value ?? {}) };
    return NextResponse.json({
      takeaway_enabled: settings.takeaway_enabled,
      pause_mode: settings.pause_mode,
      operating_hours: settings.operating_hours,
      closing_cutoff_minutes: settings.closing_cutoff_minutes,
      prep_lead_time_minutes: settings.prep_lead_time_minutes,
      slot_interval_minutes: settings.slot_interval_minutes,
      advance_order_max_days: settings.advance_order_max_days,
      min_order_amount: settings.min_order_amount,
      max_order_amount: settings.max_order_amount,
      accepted_payment_methods: settings.accepted_payment_methods,
    });
  } catch {
    return NextResponse.json(
      {
        ...DEFAULT_TAKEAWAY_SETTINGS,
        takeaway_enabled: false,
        audio_alert_enabled: undefined,
        max_orders_per_slot: undefined,
      },
      { status: 503 }
    );
  }
}
