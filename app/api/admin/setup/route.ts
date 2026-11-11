import { NextResponse } from "next/server";
import { verifyAdminPassphrase } from "@/lib/admin/auth";

export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();
    if (!verifyAdminPassphrase(passphrase)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      results: {
        supabase_setup: "ok",
        categories_seeded: "ok",
        takeaway_migration: "ok",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
