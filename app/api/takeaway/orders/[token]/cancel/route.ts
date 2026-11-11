import { NextRequest, NextResponse } from "next/server";
import { hashTrackingToken, isTrackingToken } from "@/lib/takeaway/security";
import { canCustomerCancel } from "@/lib/takeaway/lifecycle";
import { createAdminClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ token: string }> };

export async function POST(_request: NextRequest, context: Context) {
  const { token } = await context.params;
  if (!isTrackingToken(token)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createAdminClient();
  try {
    const { data: order, error: findError } = await supabase
      .from("takeaway_orders")
      .select("id, status")
      .eq("tracking_token_hash", hashTrackingToken(token))
      .maybeSingle();

    if (findError || !order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canCustomerCancel(order.status)) {
      return NextResponse.json({ error: "Cancellation is no longer available" }, { status: 409 });
    }

    const { error: updError } = await supabase
      .from("takeaway_orders")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancellation_reason_code: "customer_request",
        cancellation_reason_label: "Demande du client / Customer request",
      })
      .eq("id", order.id);

    if (updError) throw updError;

    await supabase.from("takeaway_order_events").insert({
      order_id: order.id,
      event_type: "STATUS_CHANGED",
      previous_status: "NEW",
      new_status: "CANCELLED",
      performed_by: "customer",
      reason_code: "customer_request",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer cancellation failed", error);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}
