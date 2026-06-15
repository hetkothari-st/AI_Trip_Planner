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
});
