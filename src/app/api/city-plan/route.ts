import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCityPlan } from "@/lib/ai";
import { aggregate } from "@/lib/research";
import { geocode } from "@/lib/geocode";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  city: z.string().min(1).max(80),
  days: z.number().int().min(1).max(10),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { destination, city, days } = parsed.data;
  const research = await aggregate(`best things to do, spots and local food in ${city}, ${destination}`);
  const plan = await generateCityPlan(destination, city, days, research);

  // Ensure every spot has coordinates (for intra-city routing): geocode the ones the AI
  // left blank, by spot name within the city.
  await Promise.all(
    plan.spots.map(async (s) => {
      if (s.lat != null && s.lng != null) return;
      const point = await geocode(`${s.name}, ${city}, ${destination}`);
      if (point) {
        s.lat = point.lat;
        s.lng = point.lng;
      }
    }),
  );

  return NextResponse.json({ plan });
}
