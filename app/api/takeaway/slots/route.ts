import { NextResponse } from "next/server";
import { classifyPickupSlots, generateSlots } from "@/lib/takeaway/slots";
import { sanitizeTakeawaySettings } from "@/lib/takeaway/settings";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const settingsResult = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "takeaway_settings")
      .maybeSingle();

    const settings = sanitizeTakeawaySettings(settingsResult.data?.value);
    if (!settings.takeaway_enabled || settings.pause_mode) return NextResponse.json({ slots: [] });
    const slots = generateSlots(settings);

    let byTime = new Map<string, number>();
    if (slots.length > 0) {
      const slotStrings = slots.map((s) => s.toISOString());
      const { data: orders } = await supabase
        .from("takeaway_orders")
        .select("pickup_time")
        .in("pickup_time", slotStrings)
        .neq("status", "CANCELLED");

      const counts = new Map<string, number>();
      for (const row of orders || []) {
        const key = new Date(row.pickup_time).toISOString();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      byTime = counts;
    }

    return NextResponse.json({ slots: classifyPickupSlots(slots, byTime, settings.max_orders_per_slot) });
  } catch {
    return NextResponse.json({ slots: [] }, { status: 503 });
  }
}
