import { describe, expect, it } from "vitest";
import { haversineKm, seededRandom, formatDuration } from "./utils";

describe("haversineKm", () => {
  it("is ~0 for identical points", () => {
    expect(haversineKm({ lat: 30, lng: 79 }, { lat: 30, lng: 79 })).toBeCloseTo(0, 5);
  });

  it("approximates a known distance (Rishikesh → Nainital ≈ 200km crow-flies)", () => {
    const d = haversineKm({ lat: 30.087, lng: 78.267 }, { lat: 29.38, lng: 79.45 });
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(180);
  });
});

describe("seededRandom", () => {
  it("is deterministic and in [0,1)", () => {
    const a = seededRandom("garhwal");
    const b = seededRandom("garhwal");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it("differs across seeds", () => {
    expect(seededRandom("a")).not.toBe(seededRandom("b"));
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(5400)).toBe("1h 30m");
    expect(formatDuration(600)).toBe("10m");
  });
});
