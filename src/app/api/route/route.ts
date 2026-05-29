import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoute, optimizeRoute, type Waypoint } from "@/lib/maps";

export const runtime = "nodejs";

const WaypointSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const Body = z.object({
  stops: z.array(WaypointSchema).min(1),
  optimize: z.boolean().optional(),
  startName: z.string().optional(),
  endName: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stops" }, { status: 400 });
  }
  const stops: Waypoint[] = parsed.data.stops;
  if (parsed.data.optimize) {
    const { ordered, route } = await optimizeRoute(stops, parsed.data.startName, parsed.data.endName);
    return NextResponse.json({ route, order: ordered.map((s) => s.name) });
  }
  const route = await getRoute(stops);
  return NextResponse.json({ route, order: stops.map((s) => s.name) });
}
