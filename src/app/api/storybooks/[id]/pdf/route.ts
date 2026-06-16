import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { StorybookSchema } from "@/lib/storybook/types";
import { bookToHtml } from "@/lib/storybook/serialize";
import { htmlToPdf } from "@/lib/storybook/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.storybook.findUnique({ where: { id } });
  if (!row || row.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const book = StorybookSchema.parse({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  const pdf = await htmlToPdf(bookToHtml(book), book.sizePreset);
  if (!pdf) return NextResponse.json({ error: "Render failed" }, { status: 500 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${book.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
