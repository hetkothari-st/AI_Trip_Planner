import type { StoryPage } from "./types";
import type { TripSnapshot, SelectedPlace } from "@/lib/store/trip";

let n = 0;
const eid = () => `e_${n++}_${Math.random().toString(36).slice(2, 7)}`;
const pid = () => `p_${Math.random().toString(36).slice(2)}`;

type El = StoryPage["elements"][number];

const CHIP = "#1a1a1a"; // dark caption chip — legible over any photo
const ON_CHIP = "#ffffff";
const FRAME = "#ffffff"; // polaroid / journal panel

// Text + accent shapes OMIT color so they inherit the book's theme at render
// (text -> theme.ink, shape -> theme.accent); pages OMIT bg so they inherit theme.bg.
// Captions placed OVER photos use explicit CHIP/ON_CHIP so they stay legible.
const txt = (x: number, y: number, w: number, h: number, text: string, size = 28, align: "left" | "center" | "right" = "center", z = 5): El =>
  ({ id: eid(), type: "text", x, y, w, h, rotation: 0, z, props: { text, size, fontId: "display", align } });
const txtC = (x: number, y: number, w: number, h: number, text: string, size: number, color: string, align: "left" | "center" | "right" = "left", rot = 0, z = 5): El =>
  ({ id: eid(), type: "text", x, y, w, h, rotation: rot, z, props: { text, size, fontId: "display", align, color } });
const photo = (x: number, y: number, w: number, h: number, url?: string, rot = 0, z = 2): El =>
  ({ id: eid(), type: "photo", x, y, w, h, rotation: rot, z, props: url ? { url, fit: "cover" } : { fit: "cover" } });
const ticketEl = (x: number, y: number, w: number, h: number, url?: string, z = 2): El =>
  ({ id: eid(), type: "ticket", x, y, w, h, rotation: 0, z, props: url ? { url, fit: "cover" } : { fit: "cover" } });
const accent = (x: number, y: number, w: number, h: number, rot = 0, z = 1): El =>
  ({ id: eid(), type: "shape", x, y, w, h, rotation: rot, z, props: { kind: "rect" } });
const shapeC = (x: number, y: number, w: number, h: number, color: string, rot = 0, z = 1): El =>
  ({ id: eid(), type: "shape", x, y, w, h, rotation: rot, z, props: { kind: "rect", color } });

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const POLAROID_POS: Array<[number, number, number, number, number]> = [
  [5, 8, 40, 46, -6],
  [52, 12, 40, 46, 5],
  [27, 48, 40, 46, -2],
];

// One page laying out a group of places in the chosen archetype's style.
function placePage(archetype: string, group: SelectedPlace[]): StoryPage {
  const els: El[] = [];
  switch (archetype) {
    case "hero": {
      const p = group[0];
      els.push(photo(0, 0, 100, 100, p?.imageUrl));
      els.push(accent(0, 0, 100, 4, 0, 3));
      els.push(shapeC(6, 80, 64, 13, CHIP, 0, 4));
      els.push(txtC(8, 83, 60, 7, p?.name ?? "", 16, ON_CHIP, "left", 0, 5));
      break;
    }
    case "map": {
      const p = group[0];
      els.push(photo(0, 0, 100, 56, p?.imageUrl));
      els.push(accent(0, 56, 100, 44, 0, 1));
      els.push(shapeC(6, 62, 56, 12, CHIP, 0, 4));
      els.push(txtC(8, 65, 52, 7, p?.name ?? "", 15, ON_CHIP, "left", 0, 5));
      els.push(accent(22, 20, 5, 5, 45, 3), accent(48, 32, 5, 5, 45, 3), accent(70, 18, 5, 5, 45, 3));
      break;
    }
    case "journal": {
      const p = group[0];
      els.push(photo(6, 6, 46, 88, p?.imageUrl));
      els.push(shapeC(56, 6, 38, 88, FRAME, 0, 1));
      els.push(accent(56, 6, 38, 6, 0, 2));
      els.push(txtC(58, 16, 34, 14, p?.name ?? "", 22, CHIP, "left", 0, 5));
      els.push(txtC(58, 34, 34, 50, "A day to remember.", 14, "#444444", "left", 0, 5));
      break;
    }
    case "grid": {
      const pos: Array<[number, number]> = [[5, 5], [53, 5], [5, 53], [53, 53]];
      group.slice(0, 4).forEach((p, i) => els.push(photo(pos[i][0], pos[i][1], 42, 42, p.imageUrl)));
      els.push(accent(45, 45, 10, 10, 0, 3));
      break;
    }
    case "polaroid": {
      group.slice(0, 3).forEach((p, i) => {
        const [x, y, w, h, rot] = POLAROID_POS[i];
        els.push(shapeC(x, y, w, h, FRAME, rot, 1));
        els.push(photo(x + 3, y + 3, w - 6, h - 14, p.imageUrl, rot, 2));
        els.push(txtC(x + 3, y + h - 10, w - 6, 7, p.name, 10, CHIP, "center", rot, 5));
      });
      break;
    }
    case "ticket": {
      group.slice(0, 2).forEach((p, i) => {
        const y = 12 + i * 42;
        els.push(ticketEl(8, y, 84, 34, p.imageUrl));
        els.push(accent(8, y, 4, 34, 0, 3));
        els.push(shapeC(58, y + 3, 30, 9, CHIP, 0, 4));
        els.push(txtC(60, y + 4.5, 26, 6, p.name, 12, ON_CHIP, "left", 0, 5));
      });
      break;
    }
    default: {
      // "cover"-style spread: one big photo + a themed title bar.
      const p = group[0];
      els.push(accent(0, 0, 100, 4));
      els.push(photo(8, 8, 84, 60, p?.imageUrl));
      els.push(txt(8, 71, 84, 12, p?.name ?? "", 26));
      els.push(accent(8, 86, 22, 3));
      break;
    }
  }
  return { id: pid(), bg: "", elements: els };
}

const GROUP_SIZE: Record<string, number> = { grid: 4, polaroid: 3, ticket: 2 };

// Only the snapshot fields the builder needs (keeps callers + tests simple).
type SeedSnapshot = Pick<TripSnapshot, "destination" | "selected" | "order"> & { travellers?: number };

/**
 * Build a starter storybook from a saved trip. The `archetype` (the chosen template's
 * category) drives how the trip's places are laid out — so each template produces a
 * visibly different book. Colors are inherited from the book's theme at render time.
 */
export function snapshotToPages(snap: SeedSnapshot, archetype = "cover"): StoryPage[] {
  const places: SelectedPlace[] = (snap.order ?? [])
    .map((id) => snap.selected?.[id])
    .filter(Boolean) as SelectedPlace[];
  const pages: StoryPage[] = [];

  // Book cover
  pages.push({ id: pid(), bg: "", elements: [
    txt(8, 28, 84, 16, snap.destination || "Our Trip", 48),
    accent(34, 48, 32, 4),
    txt(12, 56, 76, 8, "A travel storybook", 18),
  ] });

  // Place pages laid out per the chosen archetype.
  const size = GROUP_SIZE[archetype] ?? 1;
  for (const group of chunk(places, size)) pages.push(placePage(archetype, group));

  // Who we travelled with
  const who = snap.travellers ? `${snap.travellers} of us` : "The people we travelled with";
  pages.push({ id: pid(), bg: "", elements: [
    txt(8, 10, 84, 12, "Who we travelled with", 28),
    accent(40, 25, 20, 4),
    txt(8, 38, 84, 10, who, 20),
    photo(20, 54, 60, 36),
  ] });

  // Things I brought back
  pages.push({ id: pid(), bg: "", elements: [
    txt(8, 8, 84, 12, "Things I brought back", 28),
    accent(40, 21, 20, 3),
    photo(6, 28, 42, 32), photo(52, 28, 42, 32), photo(6, 62, 42, 32), photo(52, 62, 42, 32),
  ] });

  // Tickets & stubs
  pages.push({ id: pid(), bg: "", elements: [
    txt(8, 6, 84, 10, "Tickets & stubs", 24),
    ticketEl(8, 20, 84, 30), accent(8, 20, 4, 30, 0, 3),
    ticketEl(8, 56, 84, 30), accent(8, 56, 4, 30, 0, 3),
  ] });

  return pages;
}

export function blankPages(): StoryPage[] {
  return [{ id: pid(), bg: "", elements: [] }];
}
