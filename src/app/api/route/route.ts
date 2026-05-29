import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoute, optimizeOrder, type Waypoint } from "@/lib/maps";

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
  let stops: Waypoint[] = parsed.data.stops;
  let order = stops.map((s) => s.name);
  if (parsed.data.optimize) {
    stops = optimizeOrder(stops, parsed.data.startName, parsed.data.endName);
    order = stops.map((s) => s.name);
  }
  const route = await getRoute(stops);
  return NextResponse.json({ route, order });
}
