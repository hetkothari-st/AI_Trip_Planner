import { describe, it, expect } from "vitest";
import { buildSignature } from "./cloudinary";

describe("cloudinary signature", () => {
  it("signs sorted params with sha1(params+secret)", () => {
    // Cloudinary's documented example: timestamp=1315060510&public_id=sample + secret "abcd"
    const sig = buildSignature({ public_id: "sample", timestamp: 1315060510 }, "abcd");
    expect(sig).toBe("c3470533147774275dd37996cc4d0e68fd03cd4f");
  });
  it("ignores empty values and sorts keys", () => {
    const a = buildSignature({ b: "2", a: "1" }, "x");
    const b = buildSignature({ a: "1", b: "2", c: "" }, "x");
    expect(a).toBe(b);
  });
});
