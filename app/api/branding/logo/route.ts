import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { readFile } from "@/lib/storage";

export async function GET() {
  const b = await getSetting("branding");
  if (!b.logoKey || !b.logoAuthorized) return new NextResponse("Introuvable", { status: 404 });
  const buf = await readFile(b.logoKey);
  const type = b.logoKey.endsWith(".png") ? "image/png" : b.logoKey.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new NextResponse(new Uint8Array(buf), { headers: { "content-type": type, "cache-control": "public, max-age=3600" } });
}
