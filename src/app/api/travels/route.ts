import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { VisitedPlaceUpsertSchema, type VisitedPlace } from "@/lib/travels/types";

export const runtime = "nodejs";

// activities is stored as a JSON string column; (de)serialize at the boundary.
type Row = {
  id: string;
  name: string;
  destination: string;
  regionName: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  activities: string | null;
  rating: number | null;
  notes: string | null;
  companions: number | null;
  createdAt: Date;
};

function rowToVisited(r: Row): VisitedPlace {
  return {
    id: r.id,
    name: r.name,
    destination: r.destination,
    regionName: r.regionName ?? undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    photoUrl: r.photoUrl ?? undefined,
    startDate: r.startDate ?? undefined,
    endDate: r.endDate ?? undefined,
    budget: r.budget ?? undefined,
    activities: r.activities ? (JSON.parse(r.activities) as string[]) : [],
    rating: r.rating ?? undefined,
    notes: r.notes ?? undefined,
    companions: r.companions ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * GET /api/travels?clientId=... — visited places for the signed-in user, or for the device
 * (clientId) when anonymous. A logged-in session always takes precedence over clientId.
 */
export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const clientId = new URL(req.url).searchParams.get("clientId");
  const where = userId ? { userId } : clientId ? { clientId } : null;
  if (!where) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const rows = (await prisma.visitedPlace.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })) as Row[];
  return NextResponse.json({ entries: rows.map(rowToVisited) });
}

/** POST /api/travels — upsert one visited place (create or update). */
export async function POST(req: Request) {
  const parsed = VisitedPlaceUpsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid visited place" }, { status: 400 });
  }
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { clientId, activities, createdAt, ...rest } = parsed.data;
  // Shared columns. createdAt is set only on create so editing keeps the original timestamp.
  // A signed-in write also links/claims the row to the user.
  const common = { ...rest, clientId, userId, activities: JSON.stringify(activities ?? []) };
  await prisma.visitedPlace.upsert({
    where: { id: rest.id },
    create: { ...common, createdAt: new Date(createdAt) },
    update: common,
  });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/travels?clientId=...&id=... — remove one entry (scoped to user or device). */
export async function DELETE(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const params = new URL(req.url).searchParams;
  const clientId = params.get("clientId");
  const id = params.get("id");
  const check = z.object({ clientId: z.string().min(1), id: z.string().min(1) }).safeParse({
    clientId,
    id,
  });
  if (!check.success) return NextResponse.json({ error: "id + clientId required" }, { status: 400 });
  await prisma.visitedPlace.deleteMany({
    where: userId
      ? { id: check.data.id, userId }
      : { id: check.data.id, clientId: check.data.clientId },
  });
  return NextResponse.json({ ok: true });
}
