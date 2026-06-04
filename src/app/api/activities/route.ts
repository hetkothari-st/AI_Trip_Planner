import { NextResponse } from "next/server";
import { z } from "zod";
import { getActivityProvider } from "@/lib/activities/provider";

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
  const activities = await getActivityProvider().search(destination, city, cityLat, cityLng);
  // Give any activity still missing a location one near the city centre, so it can be
  // paired with the nearest spot in the UI. Map to NEW objects — LLM activities are shared
  // references in the 24h cache, so mutating them in place would leak coords across requests.
  const center = { lat: cityLat ?? 30.0, lng: cityLng ?? 79.0 };
  const located = activities.map((a, i) =>
    a.lat == null || a.lng == null
      ? {
          ...a,
          lat: center.lat + ((i % 5) - 2) * 0.012,
          lng: center.lng + (((i + 2) % 5) - 2) * 0.012,
        }
      : a,
  );
  return NextResponse.json({ activities: located });
}
