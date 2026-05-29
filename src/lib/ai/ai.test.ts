import { describe, expect, it } from "vitest";
import { RegionsResponseSchema, RankedPlaceSchema } from "./schemas";
import { mockRegions, mockCategories, mockPlaces } from "./mock";

describe("mock data conforms to schemas", () => {
  it("produces valid Uttarakhand regions", () => {
    const regions = mockRegions("Uttarakhand");
    expect(() => RegionsResponseSchema.parse({ regions })).not.toThrow();
    expect(regions.map((r) => r.id)).toContain("garhwal");
  });

  it("generates region-specific categories", () => {
    const cats = mockCategories("Uttarakhand", "garhwal");
    expect(cats.length).toBeGreaterThanOrEqual(3);
    expect(cats.every((c) => c.id && c.label && c.description)).toBe(true);
  });

  it("ranks places within selected categories", () => {
    const places = mockPlaces("Uttarakhand", "garhwal", ["popular", "untouched"]);
    expect(places.length).toBeGreaterThan(0);
    places.forEach((p) => expect(() => RankedPlaceSchema.parse(p)).not.toThrow());
    // ranks restart at 1 per category
    const popular = places.filter((p) => p.categoryId === "popular");
    expect(popular[0]?.rank).toBe(1);
  });
});

describe("schema validation rejects bad input", () => {
  it("rejects a place missing coordinates", () => {
    const bad = { id: "x", name: "X", categoryId: "popular", rank: 1, description: "d", bestSeason: "autumn", imageQuery: "q" };
    expect(() => RankedPlaceSchema.parse(bad)).toThrow();
  });
});
