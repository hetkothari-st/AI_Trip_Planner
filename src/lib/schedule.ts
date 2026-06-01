import { estTravel, haversineKm } from "@/lib/utils";

/**
 * Builds a realistic, timed day-by-day schedule from the planned cities.
 *
 * For each city we split its kept spots across its nights+1 days, reorder each
 * day's stops by nearest-neighbour from the hotel (least zig-zag), then walk a
 * clock forward: travel hop → arrive → spend the spot's duration → depart. A
 * city's first day prepends the inter-city drive that gets you there, and a
 * lunch block is dropped in once the clock crosses the lunch hour.
 *
 * Pure and React-agnostic so the same result feeds the on-screen itinerary and
 * the Excel export.
 */

export type EntryKind = "drive" | "spot" | "lunch";

interface LatLng {
  lat: number;
  lng: number;
}

export interface ScheduleEntry {
  kind: EntryKind;
  title: string;
  description?: string;
  category?: string;
  startMin: number; // minutes from midnight
  endMin: number;
  travelMin?: number; // travel time taken to reach this entry
  travelKm?: number;
  overflow?: boolean; // runs past the soft day-end cap
}

export interface DaySchedule {
  dayNumber: number; // continuous across the whole trip, 1-based
  cityName: string;
  cityIndex: number; // 0-based position of the city in the route
  entries: ScheduleEntry[];
  endMin: number; // clock when the day's last entry finishes (dayStart if empty)
  overflows: boolean; // day runs past the soft cap
}

export interface ScheduleSpot {
  name: string;
  description?: string;
  category: string;
  durationMin: number;
  lat?: number;
  lng?: number;
}

export interface ScheduleCity {
  name: string;
  days: number;
  hotel?: LatLng;
  spots: ScheduleSpot[];
  /** Inter-city leg that brings you into this city (undefined for the first city). */
  driveFromPrev?: { distanceKm: number; durationSec: number };
}

export interface ScheduleOptions {
  dayStartMin: number; // e.g. 540 = 09:00
  dayEndMin?: number; // soft cap; entries ending past it are flagged (undefined = no cap)
  lunch: boolean;
  lunchStartMin?: number; // default 13:00
  lunchDurMin?: number; // default 60
}

const DEFAULT_LUNCH_START = 13 * 60;
const DEFAULT_LUNCH_DUR = 60;

/** "9:00 AM" / "1:30 PM" from minutes-since-midnight. */
export function fmtClock(min: number): string {
  const total = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  let h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Greedy nearest-neighbour ordering of stops starting from `from` (hotel). */
function orderByNearest(from: LatLng | undefined, spots: ScheduleSpot[]): ScheduleSpot[] {
  if (spots.length < 2) return spots;
  const remaining = [...spots];
  const out: ScheduleSpot[] = [];
  let cur: LatLng | undefined = from;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i];
      const d =
        cur && s.lat != null && s.lng != null
          ? haversineKm(cur, { lat: s.lat, lng: s.lng })
          : 0;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    out.push(next);
    if (next.lat != null && next.lng != null) cur = { lat: next.lat, lng: next.lng };
  }
  return out;
}

export function scheduleTrip(cities: ScheduleCity[], opts: ScheduleOptions): DaySchedule[] {
  const lunchStart = opts.lunchStartMin ?? DEFAULT_LUNCH_START;
  const lunchDur = opts.lunchDurMin ?? DEFAULT_LUNCH_DUR;
  const out: DaySchedule[] = [];
  let dayCounter = 0;

  cities.forEach((city, cityIndex) => {
    const days = Math.max(1, city.days);
    const perDay = Math.max(1, Math.ceil(city.spots.length / days));

    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
      dayCounter++;
      const slice = city.spots.slice(dayIdx * perDay, (dayIdx + 1) * perDay);
      const ordered = orderByNearest(city.hotel, slice);
      const entries: ScheduleEntry[] = [];
      let clock = opts.dayStartMin;
      let lunchInserted = false;
      // Last known location to measure the next travel hop from — starts at the hotel.
      let loc: LatLng | undefined = city.hotel;

      // Arrival day: prepend the drive into this city.
      if (dayIdx === 0 && city.driveFromPrev) {
        const driveMin = Math.round(city.driveFromPrev.durationSec / 60);
        entries.push({
          kind: "drive",
          title: `Drive to ${city.name}`,
          startMin: clock,
          endMin: clock + driveMin,
          travelMin: driveMin,
          travelKm: city.driveFromPrev.distanceKm,
        });
        clock += driveMin;
      }

      for (const spot of ordered) {
        // Lunch slot once the clock reaches the lunch hour.
        if (opts.lunch && !lunchInserted && clock >= lunchStart) {
          entries.push({
            kind: "lunch",
            title: "Lunch break",
            startMin: clock,
            endMin: clock + lunchDur,
          });
          clock += lunchDur;
          lunchInserted = true;
        }

        const hop =
          loc && spot.lat != null && spot.lng != null
            ? estTravel(loc, { lat: spot.lat, lng: spot.lng })
            : { distanceKm: 0, durationSec: 0 };
        const travelMin = Math.round(hop.durationSec / 60);
        const startMin = clock + travelMin;
        const endMin = startMin + spot.durationMin;
        entries.push({
          kind: "spot",
          title: spot.name,
          description: spot.description,
          category: spot.category,
          startMin,
          endMin,
          travelMin: travelMin || undefined,
          travelKm: hop.distanceKm || undefined,
          overflow: opts.dayEndMin != null && endMin > opts.dayEndMin,
        });
        clock = endMin;
        if (spot.lat != null && spot.lng != null) loc = { lat: spot.lat, lng: spot.lng };
      }

      const endMin = entries.length ? entries[entries.length - 1].endMin : opts.dayStartMin;
      out.push({
        dayNumber: dayCounter,
        cityName: city.name,
        cityIndex,
        entries,
        endMin,
        overflows: opts.dayEndMin != null && endMin > opts.dayEndMin,
      });
    }
  });

  return out;
}
