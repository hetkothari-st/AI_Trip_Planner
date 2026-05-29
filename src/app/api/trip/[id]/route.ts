import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const StopSchema = z.object({
  name: z.string(),
  category: z.string().nullish(),
  lat: z.number(),
  lng: z.number(),
  order: z.number().int(),
  days: z.number().int().min(1),
});

const Body = z.object({
  destination: z.string().min(2),
  region: z.string().nullish(),
  stops: z.array(StopSchema),
});

/** Load a saved trip draft. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id }, include: { stops: true } });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ trip });
}

/** Upsert a trip draft and replace its stops. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trip" }, { status: 400 });
  }
  const { destination, region, stops } = parsed.data;

  const trip = await prisma.trip.upsert({
    where: { id },
    create: { id, destination, region: region ?? null },
    update: { destination, region: region ?? null },
  });

  // Replace stops wholesale — drafts are small and this keeps ordering simple.
  await prisma.tripStop.deleteMany({ where: { tripId: trip.id } });
  if (stops.length) {
    await prisma.tripStop.createMany({
      data: stops.map((s) => ({
        tripId: trip.id,
        name: s.name,
        category: s.category ?? null,
        lat: s.lat,
        lng: s.lng,
        order: s.order,
        days: s.days,
      })),
    });
  }

  const saved = await prisma.trip.findUnique({ where: { id: trip.id }, include: { stops: true } });
  return NextResponse.json({ trip: saved });
}
