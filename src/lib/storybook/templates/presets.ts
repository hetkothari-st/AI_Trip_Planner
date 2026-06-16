import type { StoryPage } from "../types";
import type { TemplatePreset } from "./index";
import { THEMES, type Theme } from "./themes";

type El = StoryPage["elements"][number];

let n = 0;
const eid = () => `e${n++}`;

const photo = (x: number, y: number, w: number, h: number, rot = 0, z = 2): El =>
  ({ id: eid(), type: "photo", x, y, w, h, rotation: rot, z, props: { fit: "cover" } });
const ticket = (x: number, y: number, w: number, h: number, z = 2): El =>
  ({ id: eid(), type: "ticket", x, y, w, h, rotation: 0, z, props: { fit: "cover" } });
const text = (x: number, y: number, w: number, h: number, t: string, size: number, color: string, align: "left" | "center" | "right" = "center", z = 5): El =>
  ({ id: eid(), type: "text", x, y, w, h, rotation: 0, z, props: { text: t, size, color, align, fontId: "display" } });
const block = (x: number, y: number, w: number, h: number, color: string, rot = 0, z = 1): El =>
  ({ id: eid(), type: "shape", x, y, w, h, rotation: rot, z, props: { kind: "rect", color } });

const CHIP = "#1a1a1a"; // dark caption chip — keeps text legible over any photo/theme
const ON_CHIP = "#ffffff";

// 7 layout archetypes. Each takes the full theme so it can paint with the theme's
// background, accent, and accent2 — so the same archetype looks different per theme,
// and the 7 archetypes look different from each other.
const archetypes: Record<string, (t: Theme) => StoryPage[]> = {
  cover: (t) => [{ id: "p0", bg: t.palette.bg, elements: [
    photo(8, 8, 84, 52),
    text(8, 64, 84, 13, "OUR TRIP", 46, t.palette.ink),
    block(8, 80, 28, 5, t.palette.accent),
    block(78, 9, 12, 12, t.palette.accent2, 8),
  ] }],
  hero: (t) => [{ id: "p0", bg: t.palette.bg, elements: [
    photo(0, 0, 100, 100),
    block(0, 0, 100, 4, t.palette.accent, 0, 3),
    block(6, 80, 62, 13, CHIP, 0, 4),
    text(8, 83, 58, 7, "A MOMENT TO REMEMBER", 15, ON_CHIP, "left"),
  ] }],
  grid: (t) => [{ id: "p0", bg: t.palette.accent, elements: [
    photo(5, 5, 42, 42),
    photo(53, 5, 42, 42),
    photo(5, 53, 42, 42),
    photo(53, 53, 42, 42),
    block(45, 45, 10, 10, t.palette.accent2, 0, 3),
  ] }],
  polaroid: (t) => [{ id: "p0", bg: t.palette.bg, elements: [
    block(5, 8, 40, 46, "#ffffff", -6, 1), photo(8, 11, 34, 34, -6, 2),
    block(52, 12, 40, 46, "#ffffff", 5, 1), photo(55, 15, 34, 34, 5, 2),
    block(27, 48, 40, 46, "#ffffff", -2, 1), photo(30, 51, 34, 34, -2, 2),
    block(45, 40, 9, 9, t.palette.accent, 45, 4),
  ] }],
  journal: (t) => [{ id: "p0", bg: t.palette.bg, elements: [
    photo(6, 6, 46, 88),
    block(56, 6, 38, 88, t.palette.paper, 0, 1),
    block(56, 6, 38, 6, t.palette.accent, 0, 2),
    text(58, 16, 34, 70, "Dear diary,\ntoday we wandered\nthrough old streets\nand found magic.", 15, "#1a1a1a", "left"),
  ] }],
  ticket: (t) => [{ id: "p0", bg: t.palette.bg, elements: [
    text(8, 5, 84, 8, "BOARDING PASS", 18, t.palette.ink, "left"),
    ticket(8, 16, 84, 30),
    block(8, 16, 4, 30, t.palette.accent, 0, 3),
    ticket(8, 52, 84, 30),
    block(8, 52, 4, 30, t.palette.accent, 0, 3),
  ] }],
  map: (t) => [{ id: "p0", bg: t.palette.bg, elements: [
    photo(0, 0, 100, 56),
    block(0, 56, 100, 44, t.palette.accent2, 0, 1),
    block(6, 62, 52, 12, CHIP, 0, 4),
    text(8, 65, 48, 7, "WHERE WE WENT", 15, ON_CHIP, "left"),
    block(22, 20, 5, 5, t.palette.accent, 45, 3),
    block(48, 32, 5, 5, t.palette.accent, 45, 3),
    block(70, 18, 5, 5, t.palette.accent, 45, 3),
  ] }],
};

const archetypeOrder = ["cover", "hero", "grid", "polaroid", "journal", "ticket", "map"];
const themeIds = ["vintage-kraft", "clean-editorial", "film-polaroid", "postcard", "boarding-pass", "bauhaus"];

export const PRESETS: TemplatePreset[] = themeIds.flatMap((themeId) =>
  archetypeOrder.map((arch) => {
    n = 0; // reset element-id counter per preset for stable ids
    return {
      id: `${themeId}-${arch}`,
      name: `${arch[0].toUpperCase()}${arch.slice(1)} — ${themeId.replace("-", " ")}`,
      themeId,
      category: arch,
      thumbnail: `/storybook-thumbs/${themeId}-${arch}.svg`,
      pages: archetypes[arch](THEMES[themeId]),
    };
  }),
);
