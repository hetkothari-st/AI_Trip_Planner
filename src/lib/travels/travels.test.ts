import { describe, expect, it } from "vitest";
import {
  namesMatch,
  isPlaceVisited,
  tripDays,
  travelStats,
  type VisitedPlace,
} from "./types";

function entry(p: Partial<VisitedPlace>): VisitedPlace {
  return {
    id: "x",
    name: "Kedarnath",
    destination: "Uttarakhand",
    activities: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...p,
  };
}

describe("namesMatch", () => {
  it("matches exact and whole-word containment", () => {
    expect(namesMatch("Kedarnath", "Kedarnath Temple")).toBe(true);
    expect(namesMatch("Auli", "auli")).toBe(true);
  });
  it("does not over-match tiny tokens", () => {
    expect(namesMatch("Deoria Tal", "Naini Tal")).toBe(false);
    expect(namesMatch("Har Ki Dun", "Harsil")).toBe(false);
  });
});

describe("isPlaceVisited", () => {
  const entries = [entry({ name: "Kedarnath Temple", destination: "Uttarakhand" })];
  it("matches by name within the same destination", () => {
    expect(isPlaceVisited("Kedarnath", "Uttarakhand", entries)).toBe(true);
  });
  it("does not match across destinations", () => {
    expect(isPlaceVisited("Kedarnath", "Kerala", entries)).toBe(false);
  });
});

describe("tripDays", () => {
  it("is inclusive of both endpoints", () => {
    expect(tripDays("2026-01-01", "2026-01-03")).toBe(3);
  });
  it("is 0 when dates are missing or reversed", () => {
    expect(tripDays(undefined, "2026-01-03")).toBe(0);
    expect(tripDays("2026-01-05", "2026-01-01")).toBe(0);
  });
});

describe("travelStats", () => {
  it("aggregates places, regions, budget and days", () => {
    const s = travelStats([
      entry({ id: "1", regionName: "Garhwal", budget: 10000, startDate: "2026-01-01", endDate: "2026-01-02" }),
      entry({ id: "2", name: "Nainital", regionName: "Kumaon", budget: 5000 }),
    ]);
    expect(s.places).toBe(2);
    expect(s.regions).toBe(2);
    expect(s.totalBudget).toBe(15000);
    expect(s.totalDays).toBe(2);
  });
});
