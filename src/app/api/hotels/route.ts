import { NextResponse } from "next/server";
import { z } from "zod";
import { getHotelProvider } from "@/lib/hotels/provider";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  city: z.string().min(1).max(80),
  budgetMax: z.number().int().min(500).max(100000),
  minStars: z.number().int().min(1).max(5),
  nights: z.number().int().min(1).max(60),
  cityLat: z.number().optional(),
  cityLng: z.number().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const hotels = await getHotelProvider().search(parsed.data);
  return NextResponse.json({ hotels });
}
