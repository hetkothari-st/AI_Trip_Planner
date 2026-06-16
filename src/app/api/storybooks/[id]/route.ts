import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { StorybookSaveSchema } from "@/lib/storybook/types";

export const runtime = "nodejs";

type OwnedBookResult = {
  error?: NextResponse;
  userId?: string;
  book?: Awaited<ReturnType<typeof prisma.storybook.findUnique>>;
};

async function ownedBook(id: string): Promise<OwnedBookResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const book = await prisma.storybook.findUnique({ where: { id } });
  if (!book || book.userId !== userId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { userId, book };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedBook(id);
  if (r.error) return r.error;
  return NextResponse.json({ book: r.book });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedBook(id);
  if (r.error) return r.error;
  const parsed = StorybookSaveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { coverUrl, status, pages, ...rest } = parsed.data;
  await prisma.storybook.update({
    where: { id },
    data: { ...rest, coverUrl, status, pages: pages as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedBook(id);
  if (r.error) return r.error;
  await prisma.storybook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
