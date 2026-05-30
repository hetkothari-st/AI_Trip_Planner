import { NextResponse } from "next/server";
import { z } from "zod";
import { recommendActivities } from "@/lib/ai";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  city: z.string().min(1).max(80),
  cityLat: z.number().optional(),
  cityLng: z.number().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { destination, city, cityLat, cityLng } = parsed.data;
  const activities = await recommendActivities(destination, city, cityLat, cityLng);
  // Give any activity still missing a location one near the city centre, so it can be
  // paired with the nearest spot in the UI.
  const center = { lat: cityLat ?? 30.0, lng: cityLng ?? 79.0 };
  activities.forEach((a, i) => {
    if (a.lat == null || a.lng == null) {
      a.lat = center.lat + ((i % 5) - 2) * 0.012;
      a.lng = center.lng + (((i + 2) % 5) - 2) * 0.012;
    }
  });
  return NextResponse.json({ activities });
}
