import { describe, expect, it } from "vitest";
import { parsePriceFromText } from "./scrape";

describe("parsePriceFromText", () => {
  it("extracts the first rupee amount with thousands separators", () => {
    expect(parsePriceFromText('... "displayPrice":"₹3,499" ...')).toBe(3499);
  });

  it("handles a space after the symbol", () => {
    expect(parsePriceFromText("Starts at ₹ 1,250 per night")).toBe(1250);
  });

  it("returns null when no plausible price is present", () => {
    expect(parsePriceFromText("no prices here")).toBeNull();
    expect(parsePriceFromText("₹12")).toBeNull();
  });

  it("ignores absurd values above the ceiling", () => {
    expect(parsePriceFromText("₹9,999,999")).toBeNull();
  });
});
