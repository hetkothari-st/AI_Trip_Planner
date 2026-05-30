"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Activity, Category, CityPlan, CitySpot, RankedPlace, Region } from "@/lib/ai/schemas";
import type { Hotel } from "@/lib/hotels/types";
import type { RouteResult } from "@/lib/maps";

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface SelectedPlace extends RankedPlace {
  days: number;
  imageUrl?: string;
}

/** The serializable data of a trip (everything in TripState except the actions). */
export interface TripSnapshot {
  step: WizardStep;
  tripId: string | null;
  destination: string;
  regions: Region[];
  region: Region | null; // "primary" (first selected) — kept for previews/itinerary hero
  selectedRegionIds: string[]; // multi-region selection
  categories: Category[];
  selectedCategoryIds: string[];
  places: RankedPlace[];
  selected: Record<string, SelectedPlace>;
  order: string[];
  cityPlans: Record<string, CityPlan>;
  selectedSpots: Record<string, string[]>; // spot names the user kept, per city id
  hotels: Record<string, Hotel>;
  activities: Record<string, Activity[]>;
  startId: string | null;
  endId: string | null;
  route: RouteResult | null;
}

interface TripState extends TripSnapshot {
  // navigation
  goTo: (step: WizardStep) => void;
  next: () => void;
  back: () => void;

  // data setters
  setDestination: (d: string) => void;
  setRegions: (r: Region[]) => void;
  chooseRegion: (r: Region) => void;
  toggleRegion: (id: string) => void;
  setCategories: (c: Category[]) => void;
  toggleCategory: (id: string) => void;
  setPlaces: (p: RankedPlace[]) => void;
  togglePlace: (p: RankedPlace) => void;
  setDays: (id: string, days: number) => void;
  setCityPlan: (id: string, plan: CityPlan) => void;
  toggleSpot: (cityId: string, spotName: string) => void;
  setCitySpots: (cityId: string, spotNames: string[]) => void;
  setHotel: (id: string, hotel: Hotel | null) => void;
  toggleActivity: (id: string, activity: Activity) => void;
  setOrder: (ids: string[]) => void;
  setStart: (id: string | null) => void;
  setEnd: (id: string | null) => void;
  setRoute: (r: RouteResult | null) => void;

  /** Deselect every place at once (drops their derived city plans, hotels, activities). */
  clearPlaces: () => void;
  /** Replace the whole wizard with a saved snapshot. */
  load: (snap: TripSnapshot) => void;
  reset: () => void;
}

const initial = {
  step: 0 as WizardStep,
  tripId: null,
  destination: "",
  regions: [] as Region[],
  region: null,
  selectedRegionIds: [] as string[],
  categories: [] as Category[],
  selectedCategoryIds: [] as string[],
  places: [] as RankedPlace[],
  selected: {} as Record<string, SelectedPlace>,
  order: [] as string[],
  cityPlans: {} as Record<string, CityPlan>,
  selectedSpots: {} as Record<string, string[]>,
  hotels: {} as Record<string, Hotel>,
  activities: {} as Record<string, Activity[]>,
  startId: null,
  endId: null,
  route: null,
};

export const useTrip = create<TripState>()(
  persist(
    (set, get) => ({
      ...initial,

      goTo: (step) => set({ step }),
      next: () => set({ step: Math.min(6, get().step + 1) as WizardStep }),
      back: () => set({ step: Math.max(0, get().step - 1) as WizardStep }),

      setDestination: (destination) => set({ destination }),
      setRegions: (regions) => set({ regions }),
      chooseRegion: (region) =>
        set({ region, selectedRegionIds: [region.id], categories: [], selectedCategoryIds: [], places: [] }),
      toggleRegion: (id) =>
        set((s) => {
          const ids = s.selectedRegionIds.includes(id)
            ? s.selectedRegionIds.filter((r) => r !== id)
            : [...s.selectedRegionIds, id];
          // Keep `region` as the first selected (drives previews + itinerary hero).
          const primary = s.regions.find((r) => r.id === ids[0]) ?? null;
          return { selectedRegionIds: ids, region: primary };
        }),
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
          const selected = { ...s.selected };
          let order = [...s.order];
          if (selected[p.id]) {
            // deselect — drop its derived data too
            delete selected[p.id];
            order = order.filter((id) => id !== p.id);
            const cityPlans = { ...s.cityPlans };
            const selectedSpots = { ...s.selectedSpots };
            const hotels = { ...s.hotels };
            const activities = { ...s.activities };
            delete cityPlans[p.id];
            delete selectedSpots[p.id];
            delete hotels[p.id];
            delete activities[p.id];
            return {
              selected,
              order,
              cityPlans,
              selectedSpots,
              hotels,
              activities,
              startId: s.startId === p.id ? null : s.startId,
              endId: s.endId === p.id ? null : s.endId,
            };
          }
          selected[p.id] = { ...p, days: p.recommendedDays ?? 1 };
          order.push(p.id);
          return { selected, order };
        }),
      setDays: (id, days) =>
        set((s) => {
          const sel = s.selected[id];
          if (!sel) return {};
          return { selected: { ...s.selected, [id]: { ...sel, days: Math.max(1, days) } } };
        }),
      setCityPlan: (id, plan) =>
        set((s) => ({
          cityPlans: { ...s.cityPlans, [id]: plan },
          // Default every spot to selected the first time a city is planned; the user
          // then deselects the ones they don't want.
          selectedSpots: s.selectedSpots[id]
            ? s.selectedSpots
            : { ...s.selectedSpots, [id]: plan.spots.map((sp) => sp.name) },
        })),
      toggleSpot: (cityId, spotName) =>
        set((s) => {
          const cur = s.selectedSpots[cityId] ?? [];
          const next = cur.includes(spotName)
            ? cur.filter((n) => n !== spotName)
            : [...cur, spotName];
          return { selectedSpots: { ...s.selectedSpots, [cityId]: next } };
        }),
      setCitySpots: (cityId, spotNames) =>
        set((s) => ({ selectedSpots: { ...s.selectedSpots, [cityId]: spotNames } })),
      setHotel: (id, hotel) =>
        set((s) => {
          const hotels = { ...s.hotels };
          if (hotel) hotels[id] = hotel;
          else delete hotels[id];
          return { hotels };
        }),
      toggleActivity: (id, activity) =>
        set((s) => {
          const list = s.activities[id] ?? [];
          const exists = list.some((a) => a.id === activity.id);
          return {
            activities: {
              ...s.activities,
              [id]: exists ? list.filter((a) => a.id !== activity.id) : [...list, activity],
            },
          };
        }),
      setOrder: (ids) => set({ order: ids }),
      setStart: (startId) => set({ startId }),
      setEnd: (endId) => set({ endId }),
      setRoute: (route) => set({ route }),

      clearPlaces: () =>
        set({
          selected: {},
          order: [],
          cityPlans: {},
          selectedSpots: {},
          hotels: {},
          activities: {},
          startId: null,
          endId: null,
          route: null,
        }),
      load: (snap) => set({ ...initial, ...snap }),
      reset: () => set({ ...initial }),
    }),
    { name: "ai-trip-planner" },
  ),
);

/** Selected places in itinerary order. */
export function selectedList(state: TripState): SelectedPlace[] {
  return state.order.map((id) => state.selected[id]).filter(Boolean);
}

/** The Region objects the user picked (multi-region), in discovery order. */
export function selectedRegions(state: TripState): Region[] {
  return state.regions.filter((r) => state.selectedRegionIds.includes(r.id));
}

/** The spots a user kept for a city, in plan order. Falls back to all when unset. */
export function selectedSpotsOf(
  state: TripState,
  cityId: string,
  plan: CityPlan,
): CitySpot[] {
  const names = state.selectedSpots[cityId];
  if (!names) return plan.spots;
  const keep = new Set(names);
  return plan.spots.filter((sp) => keep.has(sp.name));
}

/** Suggested days for a city from its kept-spot count (~3 spots a day, min 1). */
export function suggestedDays(spotCount: number): number {
  return Math.max(1, Math.ceil(spotCount / 3));
}

/** Extract just the serializable trip data from the live store (drops the action fns). */
export function snapshotOf(state: TripState): TripSnapshot {
  return {
    step: state.step,
    tripId: state.tripId,
    destination: state.destination,
    regions: state.regions,
    region: state.region,
    selectedRegionIds: state.selectedRegionIds,
    categories: state.categories,
    selectedCategoryIds: state.selectedCategoryIds,
    places: state.places,
    selected: state.selected,
    order: state.order,
    cityPlans: state.cityPlans,
    selectedSpots: state.selectedSpots,
    hotels: state.hotels,
    activities: state.activities,
    startId: state.startId,
    endId: state.endId,
    route: state.route,
  };
}

/** True when the wizard holds enough to be worth saving (a destination, at least). */
export function tripHasContent(s: TripSnapshot): boolean {
  return !!s.destination || s.regions.length > 0 || Object.keys(s.selected).length > 0;
}
