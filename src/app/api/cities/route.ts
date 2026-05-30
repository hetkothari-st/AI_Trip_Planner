import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverCities } from "@/lib/ai";
import { RegionSchema, type RankedPlace } from "@/lib/ai/schemas";
import { aggregate } from "@/lib/research";
import { geocode } from "@/lib/geocode";
import { haversineKm } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  regions: z.array(RegionSchema).min(1),
  categoryIds: z.array(z.string()).min(1),
});

/**
 * POST /api/cities — discover the cities/towns to base a stay in, across every selected
 * region × category. Cities are merged by name (accumulating their categories), tagged
 * with their region, and coordinates are corrected via geocoding when the AI's look off.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { destination, regions, categoryIds } = parsed.data;

  // One discovery call per (region, category), all in parallel.
  const jobs = regions.flatMap((region) =>
    categoryIds.map(async (categoryId) => {
      const research = await aggregate(
        `best towns and bases to stay in ${region.name}, ${destination} for ${categoryId} travel`,
      );
      const cities = await discoverCities(destination, region, categoryId, research);
      return { region, cities };
    }),
  );
  const results = await Promise.all(jobs);

  // Merge by region+name; a city found under several categories keeps all of them.
  const byKey = new Map<string, RankedPlace & { categoryIds: string[] }>();
  for (const { region, cities } of results) {
    for (const c of cities) {
      const key = `${region.id}|${c.name.toLowerCase().trim()}`;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.categoryIds.includes(c.categoryId)) existing.categoryIds.push(c.categoryId);
      } else {
        byKey.set(key, {
          ...c,
          regionId: region.id,
          regionName: region.name,
          categoryIds: [c.categoryId],
        });
      }
    }
  }

  // Correct coordinates that sit implausibly far (>2°, ~220km) from the region centre.
  const merged = [...byKey.values()];
  await Promise.all(
    merged.map(async (c) => {
      const region = regions.find((r) => r.id === c.regionId);
      const off = region && haversineKm(c, region) > 220;
      if (c.lat && c.lng && !off) return;
      const point = await geocode(`${c.name}, ${destination}`);
      if (point) {
        c.lat = point.lat;
        c.lng = point.lng;
      }
    }),
  );

  return NextResponse.json({ cities: merged });
}
