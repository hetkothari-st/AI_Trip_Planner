import { createHash } from "crypto";

/** Cloudinary signed-upload signature: sha1 of `k=v&...` (sorted, non-empty) + apiSecret. */
export function buildSignature(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}
