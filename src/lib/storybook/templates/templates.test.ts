import { describe, it, expect } from "vitest";
import { listTemplates, getTemplate, THEMES } from "./index";
import { StoryPageSchema } from "../types";

describe("template registry", () => {
  const all = listTemplates();
  it("has at least 30 presets", () => {
    expect(all.length).toBeGreaterThanOrEqual(30);
  });
  it("every preset has a unique id", () => {
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
  });
  it("every preset references an existing theme", () => {
    for (const t of all) expect(THEMES[t.themeId], t.id).toBeDefined();
  });
  it("every page validates and every element is in 0..100 bounds", () => {
    for (const t of all) {
      for (const p of t.pages) {
        expect(() => StoryPageSchema.parse(p), `${t.id}`).not.toThrow();
        for (const e of p.elements) {
          expect(e.x + e.w, `${t.id}/${e.id}`).toBeLessThanOrEqual(100.001);
          expect(e.y + e.h, `${t.id}/${e.id}`).toBeLessThanOrEqual(100.001);
        }
      }
    }
  });
  it("getTemplate finds by id", () => {
    expect(getTemplate(all[0].id)?.id).toBe(all[0].id);
  });
});
