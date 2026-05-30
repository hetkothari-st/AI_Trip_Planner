"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TripSnapshot } from "@/lib/store/trip";

export type TripStatus = "draft" | "saved";

export interface SavedTrip {
  id: string;
  name: string;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
  // denormalized preview fields so cards render without rehydrating the snapshot
  destination: string;
  region: string | null;
  placeCount: number;
  totalDays: number;
  coverImage?: string;
  snapshot: TripSnapshot;
}

interface TripsState {
  trips: SavedTrip[];
  /** The library record the wizard is currently bound to (null = unsaved fresh trip). */
  activeId: string | null;

  /**
   * Upsert the wizard's current snapshot into the library. Updates the active record when
   * one is bound, otherwise creates a new one and binds it. Returns the trip id.
   */
  saveSnapshot: (snap: TripSnapshot, status: TripStatus) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
  setActive: (id: string | null) => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** A human label from the trip's geography, e.g. "Garhwal, Uttarakhand". */
export function autoName(snap: TripSnapshot): string {
  const region = snap.region?.name;
  if (region && snap.destination) return `${region}, ${snap.destination}`;
  return snap.destination || region || "Untitled trip";
}

/** Pull the first available banner image from the selected places, for the card cover. */
function coverOf(snap: TripSnapshot): string | undefined {
  for (const id of snap.order) {
    const url = snap.selected[id]?.imageUrl;
    if (url) return url;
  }
  return undefined;
}

function preview(snap: TripSnapshot) {
  return {
    destination: snap.destination,
    region: snap.region?.name ?? null,
    placeCount: Object.keys(snap.selected).length,
    totalDays: Object.values(snap.selected).reduce((n, p) => n + p.days, 0),
    coverImage: coverOf(snap),
  };
}

export const useTrips = create<TripsState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeId: null,

      saveSnapshot: (snap, status) => {
        const now = new Date().toISOString();
        const activeId = get().activeId;
        const existing = activeId ? get().trips.find((t) => t.id === activeId) : undefined;

        if (existing) {
          const updated: SavedTrip = {
            ...existing,
            // keep a user-renamed title; only auto-name records that still hold the default
            name:
              existing.name && existing.name !== autoName(existing.snapshot)
                ? existing.name
                : autoName(snap),
            status,
            updatedAt: now,
            ...preview(snap),
            snapshot: snap,
          };
          set((s) => ({ trips: s.trips.map((t) => (t.id === updated.id ? updated : t)) }));
          return updated.id;
        }

        const trip: SavedTrip = {
          id: uid(),
          name: autoName(snap),
          status,
          createdAt: now,
          updatedAt: now,
          ...preview(snap),
          snapshot: snap,
        };
        set((s) => ({ trips: [trip, ...s.trips], activeId: trip.id }));
        return trip.id;
      },

      rename: (id, name) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === id ? { ...t, name: name.trim() || t.name } : t,
          ),
        })),

      remove: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),

      duplicate: (id) => {
        const src = get().trips.find((t) => t.id === id);
        if (!src) return null;
        const now = new Date().toISOString();
        const copy: SavedTrip = {
          ...src,
          id: uid(),
          name: `${src.name} (copy)`,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ trips: [copy, ...s.trips] }));
        return copy.id;
      },

      setActive: (activeId) => set({ activeId }),
    }),
    { name: "voyager-trips" },
  ),
);
