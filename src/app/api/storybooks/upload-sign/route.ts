import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env, hasCloudinary } from "@/lib/env";
import { buildSignature } from "@/lib/storybook/cloudinary";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasCloudinary()) return NextResponse.json({ error: "Uploads not configured" }, { status: 503 });
  const timestamp = Math.floor(new Date().getTime() / 1000);
  const folder = "storybook";
  const signature = buildSignature({ folder, timestamp }, env.cloudinarySecret);
  return NextResponse.json({
    cloudName: env.cloudinaryCloud,
    apiKey: env.cloudinaryKey,
    timestamp,
    folder,
    signature,
  });
}
