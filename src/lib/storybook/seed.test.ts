import { describe, it, expect } from "vitest";
import { snapshotToPages, blankPages } from "./seed";

const snap = {
  destination: "Goa",
  order: ["a", "b"],
  selected: {
    a: { id: "a", name: "Baga Beach", imageUrl: "https://x/baga.jpg" },
    b: { id: "b", name: "Fort Aguada", imageUrl: "https://x/fort.jpg" },
  },
  travellers: 2,
} as any;

describe("snapshotToPages", () => {
  const pages = snapshotToPages(snap);
  it("starts with a cover mentioning the destination", () => {
    expect(JSON.stringify(pages[0].elements)).toContain("Goa");
  });
  it("creates a spread per selected place with its photo and name", () => {
    const all = JSON.stringify(pages);
    expect(all).toContain("https://x/baga.jpg");
    expect(all).toContain("Baga Beach");
    expect(all).toContain("Fort Aguada");
  });
  it("appends companions + souvenirs + ticket placeholder pages", () => {
    expect(JSON.stringify(pages).toLowerCase()).toContain("ticket");
    expect(pages.length).toBeGreaterThanOrEqual(5);
  });
  it("blankPages returns a single empty page", () => {
    expect(blankPages()).toHaveLength(1);
    expect(blankPages()[0].elements).toHaveLength(0);
  });
  it("lays places out per archetype: grid packs more per page than hero", () => {
    const four = {
      destination: "X",
      order: ["a", "b", "c", "d"],
      selected: {
        a: { id: "a", name: "A", imageUrl: "u1" }, b: { id: "b", name: "B", imageUrl: "u2" },
        c: { id: "c", name: "C", imageUrl: "u3" }, d: { id: "d", name: "D", imageUrl: "u4" },
      },
    } as any;
    // grid groups 4 places onto one page; hero is one place per page → more pages.
    expect(snapshotToPages(four, "grid").length).toBeLessThan(snapshotToPages(four, "hero").length);
  });
  it("seeded pages omit bg so they inherit the theme", () => {
    expect(pages.every((p) => p.bg === "")).toBe(true);
  });
});
