"use client";

import { useTrip, snapshotOf, tripHasContent, type TripSnapshot } from "@/lib/store/trip";
import { useTrips, type TripStatus } from "@/lib/store/trips";

/**
 * Coordination between the live wizard store (`useTrip`) and the saved-trip library
 * (`useTrips`). Kept in its own module so neither store imports the other.
 */

/** Snapshot the current wizard and upsert it into the library. Returns the trip id. */
export function saveActiveTrip(status: TripStatus): string {
  const snap = snapshotOf(useTrip.getState());
  return useTrips.getState().saveSnapshot(snap, status);
}

/** Persist the current wizard as a draft if it holds anything worth keeping. */
function autosaveCurrent(): void {
  const snap = snapshotOf(useTrip.getState());
  if (!tripHasContent(snap)) return;
  const { activeId, trips, saveSnapshot } = useTrips.getState();
  // Don't clobber a trip the user already finalized as "saved" — keep its status.
  const current = activeId ? trips.find((t) => t.id === activeId) : undefined;
  saveSnapshot(snap, current?.status ?? "draft");
}

/** Load a saved trip into the wizard, auto-saving whatever's open first. */
export function loadTrip(id: string): boolean {
  const trip = useTrips.getState().trips.find((t) => t.id === id);
  if (!trip) return false;
  autosaveCurrent();
  useTrip.getState().load(trip.snapshot as TripSnapshot);
  useTrips.getState().setActive(id);
  return true;
}

/** Clear the wizard for a fresh trip, optionally saving the current one first. */
export function startNewTrip(opts: { save?: boolean } = {}): void {
  if (opts.save) autosaveCurrent();
  useTrip.getState().reset();
  useTrips.getState().setActive(null);
}

/** Delete a saved trip; if it was the one loaded in the wizard, clear the wizard too. */
export function discardTrip(id: string): void {
  const wasActive = useTrips.getState().activeId === id;
  useTrips.getState().remove(id);
  if (wasActive) {
    useTrip.getState().reset();
    useTrips.getState().setActive(null);
  }
}
