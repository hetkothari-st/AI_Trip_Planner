import { NextResponse } from "next/server";
import { z } from "zod";
import { resolvePrice } from "@/lib/pricing/resolve";
import { estimateActivityPrice, estimateHotelPrice } from "@/lib/pricing/estimate";

export const runtime = "nodejs";
export const maxDuration = 15; // Playwright nav can take a few seconds

const Body = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  kind: z.enum(["hotel", "activity"]),
  stars: z.number().min(1).max(5).optional(),
  durationMin: z.number().min(15).max(1440).optional(),
  category: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { name, city, kind, stars, durationMin, category } = parsed.data;

  const estimate = () =>
    kind === "hotel"
      ? estimateHotelPrice(name, stars ?? 3)
      : estimateActivityPrice(name, category ?? "activity", durationMin ?? 120);

  const result = await resolvePrice({ key: `${kind}:${name}:${city}`, name, city, kind, estimate });
  return NextResponse.json(result);
}
