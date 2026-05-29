import { NextResponse } from "next/server";
import { z } from "zod";
import { rankPlaces } from "@/lib/ai";
import { RegionSchema } from "@/lib/ai/schemas";
import { aggregate } from "@/lib/research";
import { getImages } from "@/lib/images";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  region: RegionSchema,
  categoryIds: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { destination, region, categoryIds } = parsed.data;

  // 1) Gather multi-source research signals (web/YouTube/Reddit) to ground the ranking.
  const research = await aggregate(
    `best places to visit in ${region.name}, ${destination} (${categoryIds.join(", ")})`,
  );

  // 2) Rank places with the LLM (or mock), grounded in the research digest.
  const places = await rankPlaces(destination, region, categoryIds, research);

  // 3) Attach banner images + fold in any real research sources.
  const images = await getImages(places.map((p) => p.imageQuery));
  const enriched = places.map((p, i) => ({
    ...p,
    imageUrl: images[i]?.url,
    sources:
      p.sources.length > 0
        ? p.sources
        : research.sources.slice(0, 3),
  }));

  return NextResponse.json({
    places: enriched,
    research: { usedConnectors: research.usedConnectors },
  });
}
