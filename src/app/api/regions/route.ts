import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverRegions } from "@/lib/ai";

export const runtime = "nodejs";

const Body = z.object({ destination: z.string().min(2).max(80) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }
  const regions = await discoverRegions(parsed.data.destination.trim());
  return NextResponse.json({ regions });
}
