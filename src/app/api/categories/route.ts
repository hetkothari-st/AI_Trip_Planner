import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCategories } from "@/lib/ai";
import { RegionSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  region: RegionSchema,
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const categories = await generateCategories(parsed.data.destination, parsed.data.region);
  return NextResponse.json({ categories });
}
