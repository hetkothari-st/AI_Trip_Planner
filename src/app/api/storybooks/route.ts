import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { blankPages } from "@/lib/storybook/seed";

export const runtime = "nodejs";

const CreateBody = z.object({
  title: z.string().min(1).max(120),
  theme: z.string().min(1),
  sizePreset: z.enum(["square", "a4-portrait", "landscape"]).default("square"),
  tripId: z.string().optional(),
  pages: z.array(z.any()).optional(), // seeded pages from client, validated on save
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const books = await prisma.storybook.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, theme: true, coverUrl: true, status: true, updatedAt: true },
  });
  return NextResponse.json({ books });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { title, theme, sizePreset, tripId, pages } = parsed.data;
  const book = await prisma.storybook.create({
    data: { userId, title, theme, sizePreset, tripId, pages: pages ?? blankPages() },
  });
  return NextResponse.json({ id: book.id });
}
