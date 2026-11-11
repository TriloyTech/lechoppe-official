import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { mergeAndValidateTakeawaySettings, sanitizeTakeawaySettings } from "@/lib/takeaway/settings";
import { createAdminClient } from "@/lib/supabase/server";

const isAuthed = isAdminRequest;

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "takeaway_settings")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ settings: sanitizeTakeawaySettings(data?.value) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = await request.json();
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "takeaway_settings")
      .maybeSingle();

    const { settings } = mergeAndValidateTakeawaySettings(existing?.value, input);
    const { data, error } = await supabase
      .from("site_settings")
      .upsert({ key: "takeaway_settings", value: settings }, { onConflict: "key" })
      .select("value")
      .single();
    if (error) throw error;
    return NextResponse.json({ settings: sanitizeTakeawaySettings(data.value) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
