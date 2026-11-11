import { NextRequest, NextResponse } from "next/server";
import { guard, failure } from "@/lib/reservations/admin";
import { uuid } from "@/lib/reservations/model";
import { changeStatus } from "@/lib/reservations/service";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    if (!uuid(id)) throw new Error("invalid_id");
    const body = await req.json();
    const supabase = createAdminClient();
    return NextResponse.json(await changeStatus(supabase, id, body.status, body.reason));
  } catch (e) {
    return failure(e);
  }
}
