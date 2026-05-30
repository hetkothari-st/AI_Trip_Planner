import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * POST /api/travels/claim — link this device's anonymous entries to the signed-in user,
 * so logging in merges everything you logged before you had an account.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = z
    .object({ clientId: z.string().min(1) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  await prisma.visitedPlace.updateMany({
    where: { clientId: parsed.data.clientId, userId: null },
    data: { userId },
  });
  return NextResponse.json({ ok: true });
}
