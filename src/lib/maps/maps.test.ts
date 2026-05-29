import { describe, expect, it } from "vitest";
import { getRoute, optimizeOrder, type Waypoint } from "./index";

const STOPS: Waypoint[] = [
  { name: "A", lat: 30.0, lng: 78.0 },
  { name: "B", lat: 30.5, lng: 78.5 },
  { name: "C", lat: 30.1, lng: 78.1 },
];

describe("optimizeOrder", () => {
  it("keeps the chosen start first and visits nearest-next", () => {
    const ordered = optimizeOrder(STOPS, "A");
    expect(ordered[0].name).toBe("A");
    // C is closer to A than B, so it should come before B
    expect(ordered.map((s) => s.name)).toEqual(["A", "C", "B"]);
  });

  it("returns input unchanged for < 3 stops", () => {
    const two = STOPS.slice(0, 2);
    expect(optimizeOrder(two)).toEqual(two);
  });
});

describe("getRoute (estimate fallback)", () => {
  it("produces legs and totals without a Mapbox token", async () => {
    const route = await getRoute(STOPS);
    expect(route.source).toBe("estimate");
    expect(route.legs).toHaveLength(2);
    expect(route.totalDistanceKm).toBeGreaterThan(0);
    expect(route.totalDurationSec).toBeGreaterThan(0);
  });
});
