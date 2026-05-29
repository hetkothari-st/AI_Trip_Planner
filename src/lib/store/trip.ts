"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, RankedPlace, Region } from "@/lib/ai/schemas";
import type { RouteResult } from "@/lib/maps";

export type WizardStep = 0 | 1 | 2 | 3 | 4;

export interface SelectedPlace extends RankedPlace {
  days: number;
  imageUrl?: string;
}

interface TripState {
  step: WizardStep;
  tripId: string | null;

  destination: string;
  regions: Region[];
  region: Region | null;

  categories: Category[];
  selectedCategoryIds: string[];

  places: RankedPlace[]; // includes optional imageUrl attached by the API
  selected: Record<string, SelectedPlace>; // keyed by place id

  route: RouteResult | null;

  // navigation
  goTo: (step: WizardStep) => void;
  next: () => void;
  back: () => void;

  // data setters
  setDestination: (d: string) => void;
  setRegions: (r: Region[]) => void;
  chooseRegion: (r: Region) => void;
  setCategories: (c: Category[]) => void;
  toggleCategory: (id: string) => void;
  setPlaces: (p: RankedPlace[]) => void;
  togglePlace: (p: RankedPlace) => void;
  setDays: (id: string, days: number) => void;
  setRoute: (r: RouteResult | null) => void;

  reset: () => void;
}

const initial = {
  step: 0 as WizardStep,
  tripId: null,
  destination: "",
  regions: [],
  region: null,
  categories: [],
  selectedCategoryIds: [],
  places: [],
  selected: {},
  route: null,
};

export const useTrip = create<TripState>()(
  persist(
    (set, get) => ({
      ...initial,

      goTo: (step) => set({ step }),
      next: () => set({ step: Math.min(4, get().step + 1) as WizardStep }),
      back: () => set({ step: Math.max(0, get().step - 1) as WizardStep }),

      setDestination: (destination) => set({ destination }),
      setRegions: (regions) => set({ regions }),
      chooseRegion: (region) =>
        set({ region, categories: [], selectedCategoryIds: [], places: [] }),
      setCategories: (categories) => set({ categories }),
      toggleCategory: (id) =>
        set((s) => ({
          selectedCategoryIds: s.selectedCategoryIds.includes(id)
            ? s.selectedCategoryIds.filter((c) => c !== id)
            : [...s.selectedCategoryIds, id],
        })),
      setPlaces: (places) => set({ places }),
      togglePlace: (p) =>
        set((s) => {
          const next = { ...s.selected };
          if (next[p.id]) {
            delete next[p.id];
          } else {
            next[p.id] = { ...p, days: 1 };
          }
          return { selected: next };
        }),
      setDays: (id, days) =>
        set((s) => {
          const sel = s.selected[id];
          if (!sel) return {};
          return { selected: { ...s.selected, [id]: { ...sel, days: Math.max(1, days) } } };
        }),
      setRoute: (route) => set({ route }),

      reset: () => set({ ...initial }),
    }),
    { name: "ai-trip-planner" },
  ),
);

/** Selected places as an ordered array (selection order preserved via id list). */
export function selectedList(state: TripState): SelectedPlace[] {
  return Object.values(state.selected);
}
