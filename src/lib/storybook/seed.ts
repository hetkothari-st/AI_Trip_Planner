import type { StoryPage } from "./types";
import type { TripSnapshot, SelectedPlace } from "@/lib/store/trip";

let n = 0;
const eid = () => `e_${n++}_${Math.random().toString(36).slice(2, 7)}`;
const pid = () => `p_${Math.random().toString(36).slice(2)}`;

type El = StoryPage["elements"][number];
const txt = (x: number, y: number, w: number, h: number, text: string, size = 28): El =>
  ({ id: eid(), type: "text", x, y, w, h, rotation: 0, z: 5, props: { text, size, fontId: "display", align: "center", color: "#1a1a1a" } });
const photo = (x: number, y: number, w: number, h: number, url?: string): El =>
  ({ id: eid(), type: "photo", x, y, w, h, rotation: 0, z: 1, props: url ? { url, fit: "cover" } : { fit: "cover" } });
const ticket = (x: number, y: number, w: number, h: number): El =>
  ({ id: eid(), type: "ticket", x, y, w, h, rotation: 0, z: 1, props: { fit: "cover" } });

// Only the snapshot fields the builder needs (keeps callers + tests simple).
type SeedSnapshot = Pick<TripSnapshot, "destination" | "selected" | "order"> & { travellers?: number };

/** Build a starter storybook from a saved trip: cover, a spread per place, then memory pages. */
export function snapshotToPages(snap: SeedSnapshot): StoryPage[] {
  const places: SelectedPlace[] = (snap.order ?? [])
    .map((id) => snap.selected?.[id])
    .filter(Boolean) as SelectedPlace[];
  const pages: StoryPage[] = [];

  // Cover
  pages.push({ id: pid(), bg: "#ffffff", elements: [
    txt(8, 30, 84, 20, snap.destination || "Our Trip", 48),
    txt(12, 54, 76, 10, "A travel storybook", 20),
  ] });

  // One spread per selected place
  for (const p of places) {
    pages.push({ id: pid(), bg: "#ffffff", elements: [
      photo(6, 6, 88, 64, p.imageUrl),
      txt(8, 74, 84, 12, p.name, 26),
    ] });
  }

  // Who we travelled with
  const who = snap.travellers ? `${snap.travellers} of us` : "The people we travelled with";
  pages.push({ id: pid(), bg: "#ffffff", elements: [
    txt(8, 10, 84, 12, "Who we travelled with", 28),
    txt(8, 40, 84, 12, who, 20),
    photo(20, 55, 60, 35),
  ] });

  // Things I brought back
  pages.push({ id: pid(), bg: "#ffffff", elements: [
    txt(8, 8, 84, 12, "Things I brought back", 28),
    photo(6, 26, 42, 32), photo(52, 26, 42, 32), photo(6, 62, 42, 32), photo(52, 62, 42, 32),
  ] });

  // Tickets & stubs
  pages.push({ id: pid(), bg: "#ffffff", elements: [
    txt(8, 6, 84, 10, "Tickets & stubs", 24),
    ticket(8, 20, 84, 32), ticket(8, 58, 84, 32),
  ] });

  return pages;
}

export function blankPages(): StoryPage[] {
  return [{ id: pid(), bg: "#ffffff", elements: [] }];
}
