import { NextResponse } from "next/server";
import { getGallery } from "@/lib/images";

export const runtime = "nodejs";

/**
 * GET /api/spot-photos?name=...&destination=...&limit=6
 * Returns a small gallery of real photos for a spot (Wikimedia Commons, Wikipedia fallback),
 * used by the spot photo lightbox in the city planner.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const destination = params.get("destination")?.trim() ?? "";
  const limit = Math.min(12, Math.max(1, Number(params.get("limit")) || 6));
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const query = destination ? `${name}, ${destination}` : name;
  const photos = await getGallery(query, limit);
  return NextResponse.json({ photos });
}
