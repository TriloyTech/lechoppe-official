import { NextRequest, NextResponse } from "next/server";
import { guard, failure } from "@/lib/reservations/admin";
import { uuid } from "@/lib/reservations/model";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const { id } = await req.json();
    if (!uuid(id)) throw new Error("invalid_id");

    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - 23 * 3600 * 1000).toISOString();

    const { data: job, error: findError } = await supabase
      .from("reservation_notifications")
      .select("id, status, recipient, attempts, first_attempt_at, last_error")
      .eq("id", id)
      .maybeSingle();

    if (findError || !job) throw new Error("retry_unsafe");
    if (!job.recipient || !["blocked", "failed"].includes(job.status)) throw new Error("retry_unsafe");
    if ((job.attempts || 0) >= 6) throw new Error("retry_unsafe");
    if (job.first_attempt_at && new Date(job.first_attempt_at) <= new Date(cutoff)) throw new Error("retry_unsafe");
    if (job.last_error === "site_url_missing") throw new Error("retry_unsafe");

    const { error: updError } = await supabase
      .from("reservation_notifications")
      .update({
        status: "pending",
        next_attempt_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", id);

    if (updError) throw updError;
    return NextResponse.json({ queued: true });
  } catch (e) {
    return failure(e);
  }
}
