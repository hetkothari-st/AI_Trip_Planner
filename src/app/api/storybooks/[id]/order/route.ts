import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  options: z.object({ size: z.string(), qty: z.number().int().min(1).max(20) }),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const book = await prisma.storybook.findUnique({ where: { id } });
  if (!book || book.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await prisma.printOrder.create({
    data: {
      storybookId: id,
      userId,
      email: parsed.data.email,
      options: parsed.data.options as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ ok: true });
}
