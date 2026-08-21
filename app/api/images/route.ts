import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { isAdminRequest } from "@/lib/admin/auth";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });

    const safeExt = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
    const relative = `/uploads/menu/${filename}`;
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads", "menu");
    await mkdir(uploadDir, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, filename), Buffer.from(arrayBuffer));

    return NextResponse.json({ url: relative });
  } catch (err) {
    console.error("[upload] Unexpected error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
