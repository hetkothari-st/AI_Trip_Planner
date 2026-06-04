import { describe, expect, it } from "vitest";
import { estimateActivityPrice, estimateHotelPrice } from "./estimate";

describe("estimateHotelPrice", () => {
  it("scales with stars and is deterministic per name", () => {
    const a = estimateHotelPrice("Pine Retreat", 5);
    const b = estimateHotelPrice("Pine Retreat", 5);
    expect(a).toBe(b);
    expect(estimateHotelPrice("Pine Retreat", 5)).toBeGreaterThan(estimateHotelPrice("Pine Retreat", 3));
  });

  it("rounds to the nearest 50 and stays positive for odd star counts", () => {
    const p = estimateHotelPrice("Some Inn", 0);
    expect(p % 50).toBe(0);
    expect(p).toBeGreaterThan(0);
  });
});

describe("estimateActivityPrice", () => {
  it("grows with duration and is deterministic per name", () => {
    const short = estimateActivityPrice("Walk", "nature", 60);
    const long = estimateActivityPrice("Walk", "nature", 240);
    expect(long).toBeGreaterThan(short);
    expect(estimateActivityPrice("Walk", "nature", 60)).toBe(short);
  });

  it("charges adventure more than nature for the same duration", () => {
    expect(estimateActivityPrice("X", "adventure", 120)).toBeGreaterThan(estimateActivityPrice("X", "nature", 120));
  });
});
