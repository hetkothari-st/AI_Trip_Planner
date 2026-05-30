import { NextResponse } from "next/server";
import { getImage } from "@/lib/images";
import { geocode } from "@/lib/geocode";

export const runtime = "nodejs";

/**
 * GET /api/enrich?name=...&destination=...
 * Resolves a banner photo (Wikipedia/Unsplash) and coordinates (Nominatim) for a logged
 * place, so manual travel-log entries get an image and a map pin automatically.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const destination = params.get("destination")?.trim() ?? "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const query = destination ? `${name}, ${destination}` : name;
  const [image, point] = await Promise.all([getImage(query), geocode(query)]);

  return NextResponse.json({
    photoUrl: image.url,
    lat: point?.lat,
    lng: point?.lng,
  });
}
