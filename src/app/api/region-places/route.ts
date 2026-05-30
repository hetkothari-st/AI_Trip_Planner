import { NextResponse } from "next/server";
import { z } from "zod";
import { notablePlaces } from "@/lib/ai";
import { RegionSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  region: RegionSchema,
});

/** POST /api/region-places — a broad AI list of notable places in a region. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const places = await notablePlaces(parsed.data.destination, parsed.data.region);
  return NextResponse.json({ places });
}
