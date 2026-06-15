import type { StoryPage } from "../types";
import type { TemplatePreset } from "./index";

let n = 0;
const eid = () => `e${n++}`;
const txt = (x: number, y: number, w: number, h: number, text: string, size = 28): StoryPage["elements"][number] =>
  ({ id: eid(), type: "text", x, y, w, h, rotation: 0, z: 5, props: { text, size, fontId: "display", align: "center", color: "#1a1a1a" } });
const slot = (x: number, y: number, w: number, h: number, kind: "photo" | "ticket" = "photo", rot = 0): StoryPage["elements"][number] =>
  ({ id: eid(), type: kind, x, y, w, h, rotation: rot, z: 1, props: { fit: "cover" } });

// 7 layout archetypes — each returns the pages for one template in the given theme.
const archetypes: Record<string, (paper: string) => StoryPage[]> = {
  cover: (bg) => [{ id: "p", bg, elements: [slot(0, 0, 100, 70), txt(10, 74, 80, 14, "Our Trip")] }],
  hero: (bg) => [{ id: "p", bg, elements: [slot(0, 0, 100, 100), txt(8, 80, 84, 12, "Caption", 22)] }],
  grid: (bg) => [{ id: "p", bg, elements: [slot(4, 4, 44, 44), slot(52, 4, 44, 44), slot(4, 52, 44, 44), slot(52, 52, 44, 44)] }],
  polaroid: (bg) => [{ id: "p", bg, elements: [slot(6, 8, 38, 40, "photo", -6), slot(52, 14, 38, 40, "photo", 5), slot(28, 52, 38, 40, "photo", -2)] }],
  journal: (bg) => [{ id: "p", bg, elements: [slot(6, 6, 50, 88), txt(60, 10, 36, 80, "Write your memory here...", 18)] }],
  ticket: (bg) => [{ id: "p", bg, elements: [slot(8, 8, 84, 36, "ticket"), slot(8, 50, 84, 36, "ticket")] }],
  map: (bg) => [{ id: "p", bg, elements: [slot(0, 0, 100, 60), txt(8, 64, 84, 24, "Where we went", 20)] }],
};

const archetypeOrder = ["cover", "hero", "grid", "polaroid", "journal", "ticket", "map"];
const themeIds = ["vintage-kraft", "clean-editorial", "film-polaroid", "postcard", "boarding-pass", "bauhaus"];
const paperOf: Record<string, string> = {
  "vintage-kraft": "#d8c3a5", "clean-editorial": "#faf8f4", "film-polaroid": "#f4f1ea",
  postcard: "#fffdf7", "boarding-pass": "#f7f7f7", bauhaus: "#f5f0e8",
};

export const PRESETS: TemplatePreset[] = themeIds.flatMap((themeId) =>
  archetypeOrder.map((arch) => {
    n = 0; // reset element-id counter per preset for stable ids
    return {
      id: `${themeId}-${arch}`,
      name: `${arch[0].toUpperCase()}${arch.slice(1)} — ${themeId.replace("-", " ")}`,
      themeId,
      category: arch,
      thumbnail: `/storybook-thumbs/${themeId}-${arch}.svg`,
      pages: archetypes[arch](paperOf[themeId]),
    };
  }),
);
