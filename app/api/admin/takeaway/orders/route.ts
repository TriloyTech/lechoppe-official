import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/takeaway/admin";
import { createAdminClient } from "@/lib/supabase/server";

const STATUSES = new Set(["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const status = request.nextUrl.searchParams.get("status");
    const search = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const supabase = createAdminClient();
    let query = supabase.from("takeaway_orders").select("*, takeaway_order_events(*)");

    if (status && STATUSES.has(status)) {
      query = query.eq("status", status);
    }
    if (search) {
      query = query.or(
        `order_reference.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    }
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      query = query.gte("placed_at", `${from}T00:00:00Z`);
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      query = query.lte("placed_at", `${to}T23:59:59Z`);
    }

    const { data, error } = await query
      .order("pickup_time", { ascending: true })
      .order("placed_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const orders = (data || []).map((o: any) => ({
      ...o,
      events: (o.takeaway_order_events || []).sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load orders" },
      { status: 500 }
    );
  }
}
