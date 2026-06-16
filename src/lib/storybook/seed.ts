import type { StoryPage } from "./types";
import type { TripSnapshot, SelectedPlace } from "@/lib/store/trip";

let n = 0;
const eid = () => `e_${n++}_${Math.random().toString(36).slice(2, 7)}`;
const pid = () => `p_${Math.random().toString(36).slice(2)}`;

type El = StoryPage["elements"][number];
// Text + shapes OMIT explicit colors so they inherit the book's theme at render time
// (text -> theme.ink, shape -> theme.accent). Pages OMIT bg (empty) so they inherit
// theme.bg. This makes a seeded book adopt the chosen theme's colors AND recolor live
// when the theme is switched in the editor.
const txt = (x: number, y: number, w: number, h: number, text: string, size = 28): El =>
  ({ id: eid(), type: "text", x, y, w, h, rotation: 0, z: 5, props: { text, size, fontId: "display", align: "center" } });
const photo = (x: number, y: number, w: number, h: number, url?: string): El =>
  ({ id: eid(), type: "photo", x, y, w, h, rotation: 0, z: 2, props: url ? { url, fit: "cover" } : { fit: "cover" } });
const ticket = (x: number, y: number, w: number, h: number): El =>
  ({ id: eid(), type: "ticket", x, y, w, h, rotation: 0, z: 2, props: { fit: "cover" } });
const accent = (x: number, y: number, w: number, h: number): El =>
  ({ id: eid(), type: "shape", x, y, w, h, rotation: 0, z: 1, props: { kind: "rect" } });

// Only the snapshot fields the builder needs (keeps callers + tests simple).
type SeedSnapshot = Pick<TripSnapshot, "destination" | "selected" | "order"> & { travellers?: number };

/** Build a starter storybook from a saved trip: cover, a spread per place, then memory pages. */
export function snapshotToPages(snap: SeedSnapshot): StoryPage[] {
  const places: SelectedPlace[] = (snap.order ?? [])
    .map((id) => snap.selected?.[id])
    .filter(Boolean) as SelectedPlace[];
  const pages: StoryPage[] = [];

  // Cover
  pages.push({ id: pid(), bg: "", elements: [
    txt(8, 28, 84, 18, snap.destination || "Our Trip", 48),
    accent(34, 49, 32, 4),
    txt(12, 56, 76, 8, "A travel storybook", 20),
  ] });

  // One spread per selected place
  for (const p of places) {
    pages.push({ id: pid(), bg: "", elements: [
      accent(0, 0, 100, 4),
      photo(6, 8, 88, 62, p.imageUrl),
      txt(8, 73, 84, 11, p.name, 26),
      accent(8, 86, 22, 3),
    ] });
  }

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
    ticket(8, 20, 84, 30), accent(8, 20, 4, 30),
    ticket(8, 56, 84, 30), accent(8, 56, 4, 30),
  ] });

  return pages;
}

export function blankPages(): StoryPage[] {
  return [{ id: pid(), bg: "", elements: [] }];
}
