import { z } from "zod";
import type { Region } from "@/lib/ai/schemas";

/**
 * A place the user has already visited — the bucket-list / travel-log record. Stored
 * locally (Zustand persist) and mirrored to the DB, keyed by a per-device clientId since
 * the app has no auth yet.
 */
export const VisitedPlaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  destination: z.string().min(1),
  regionName: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  photoUrl: z.string().optional(),
  startDate: z.string().optional(), // ISO yyyy-mm-dd
  endDate: z.string().optional(),
  budget: z.number().optional(), // total INR spent
  activities: z.array(z.string()).default([]),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  companions: z.number().optional(),
  createdAt: z.string(), // ISO timestamp
});

export type VisitedPlace = z.infer<typeof VisitedPlaceSchema>;

// Payload the client sends to persist (clientId scopes the row to a device).
export const VisitedPlaceUpsertSchema = VisitedPlaceSchema.extend({
  clientId: z.string().min(1),
});

/** Normalize a place name for fuzzy matching (lowercase, strip punctuation/parens, collapse). */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Two place names refer to the same place if equal, or if the shorter appears as a
 * whole-word run inside the longer (so "Kedarnath" == "Kedarnath Temple"). Tiny tokens
 * (<4 chars like "Tal", "Har") are NOT used for containment to avoid false positives
 * such as "Deoria Tal" vs "Naini Tal".
 */
export function namesMatch(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length < 4) return false;
  // normalizeName has already stripped regex-special chars, so this is safe to build.
  return new RegExp(`(^| )${short}( |$)`).test(long);
}

/** Has the user already visited a place with this name in this destination? */
export function isPlaceVisited(
  name: string,
  destination: string,
  entries: VisitedPlace[],
): boolean {
  const dest = normalizeName(destination);
  return entries.some(
    (e) => namesMatch(e.name, name) && (!dest || normalizeName(e.destination) === dest),
  );
}

/** Visited entries that belong to a destination (and optionally a specific region). */
export function visitedInRegion(
  entries: VisitedPlace[],
  destination: string,
  regionName?: string,
): VisitedPlace[] {
  const dest = normalizeName(destination);
  const reg = regionName ? normalizeName(regionName) : null;
  return entries.filter((e) => {
    if (normalizeName(e.destination) !== dest) return false;
    if (!reg) return true;
    return e.regionName ? normalizeName(e.regionName) === reg : false;
  });
}

/** Sample places of a region the user has NOT visited yet. */
export function remainingSamplePlaces(
  region: Region,
  destination: string,
  entries: VisitedPlace[],
): string[] {
  return region.samplePlaces.filter((sp) => !isPlaceVisited(sp, destination, entries));
}

/** Whole-number days between two ISO dates, inclusive; 0 if either missing/invalid. */
export function tripDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  const a = Date.parse(startDate);
  const b = Date.parse(endDate);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export interface TravelStats {
  places: number;
  regions: number;
  destinations: number;
  totalBudget: number;
  totalDays: number;
}

export function travelStats(entries: VisitedPlace[]): TravelStats {
  const regions = new Set<string>();
  const destinations = new Set<string>();
  let totalBudget = 0;
  let totalDays = 0;
  for (const e of entries) {
    destinations.add(normalizeName(e.destination));
    regions.add(`${normalizeName(e.destination)}|${normalizeName(e.regionName ?? "")}`);
    totalBudget += e.budget ?? 0;
    totalDays += tripDays(e.startDate, e.endDate);
  }
  return {
    places: entries.length,
    regions: regions.size,
    destinations: destinations.size,
    totalBudget,
    totalDays,
  };
}
