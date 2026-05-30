"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, MapPinned, Trash2 } from "lucide-react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { PlaceBanner } from "@/components/places/PlaceBanner";
import { useTrip, selectedRegions } from "@/lib/store/trip";
import { useTravels } from "@/lib/store/travels";
import { isPlaceVisited, namesMatch, normalizeName } from "@/lib/travels/types";

export function PlacesStep() {
  const store = useTrip();
  const {
    destination,
    region,
    categories,
    selectedCategoryIds,
    places,
    selected,
    togglePlace,
    setDays,
    clearPlaces,
    back,
    next,
  } = store;
  const chosenRegions = selectedRegions(store);
  const { entries, addVisited, removeVisited } = useTravels();
  const [clearOpen, setClearOpen] = useState(false);

  // Toggle a place in/out of the user's travel log (the "I've already been here" tick).
  const toggleVisited = (p: (typeof places)[number]) => {
    const dest = normalizeName(destination);
    const match = entries.find(
      (e) => namesMatch(e.name, p.name) && normalizeName(e.destination) === dest,
    );
    if (match) removeVisited(match.id);
    else
      addVisited({
        name: p.name,
        destination,
        regionName: region?.name,
        lat: p.lat,
        lng: p.lng,
        photoUrl: (p as typeof p & { imageUrl?: string }).imageUrl,
        activities: [],
      });
  };

  const labelFor = (id: string) =>
    categories.find((c) => c.id === id)?.label ?? id.replace(/-/g, " ");

  // Does this city belong to a category? Cities merged across categories carry categoryIds.
  const cityInCategory = (p: (typeof places)[number], catId: string) => {
    const ids = (p as typeof p & { categoryIds?: string[] }).categoryIds;
    return ids ? ids.includes(catId) : p.categoryId === catId;
  };

  // Group cities by region, then by category (skipping empty buckets).
  const regionGroups = chosenRegions
    .map((rg) => ({
      region: rg,
      catGroups: selectedCategoryIds
        .map((catId) => ({
          catId,
          cities: places.filter((p) => p.regionName === rg.name && cityInCategory(p, catId)),
        }))
        .filter((g) => g.cities.length > 0),
    }))
    .filter((g) => g.catGroups.length > 0);

  const selectedCount = Object.keys(selected).length;
  const totalDays = Object.values(selected).reduce((n, p) => n + p.days, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-6xl font-bold uppercase leading-[0.9] tracking-tighter md:text-7xl">
            Choose Your <span className="text-tertiary">Cities.</span>
          </h1>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-1 w-12 bg-primary" />
            <p className="max-w-xl text-base font-medium leading-tight text-on-surface-variant">
              Ranked towns and bases across your selected zones, by style. Add the ones you
              want — we suggest the days each needs; adjust freely.
            </p>
          </div>
        </div>
        <button
          onClick={back}
          className="flex items-center gap-2 self-start border-2 border-primary bg-surface px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </header>

      <div className="space-y-14">
        {regionGroups.map(({ region: rg, catGroups }) => (
          <div key={rg.id} className="space-y-8">
            <div className="flex items-center gap-4 border-b-2 border-primary pb-3">
              <MapPinned className="size-6 text-primary" />
              <h2 className="text-3xl font-bold uppercase tracking-tighter">{rg.name}</h2>
            </div>
            {catGroups.map(({ catId, cities }) => (
              <section key={catId}>
                <div className="mb-5 flex items-center gap-3">
                  <h3 className="text-lg font-bold uppercase tracking-wide">{labelFor(catId)}</h3>
                  <span className="border-2 border-primary bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {cities.length} {cities.length === 1 ? "City" : "Cities"}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {cities.map((p) => (
                    <PlaceBanner
                      key={p.id}
                      place={p}
                      selected={!!selected[p.id]}
                      days={selected[p.id]?.days ?? p.recommendedDays ?? 1}
                      onToggle={() => togglePlace(p)}
                      onDays={(d) => setDays(p.id, d)}
                      visited={isPlaceVisited(p.name, destination, entries)}
                      onToggleVisited={() => toggleVisited(p)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 mt-12 flex flex-col items-start justify-between gap-3 border-[3px] border-primary bg-surface p-4 neo-shadow sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
          <MapPinned className="size-4 text-primary" />
          <span className="text-lg font-bold text-primary">{selectedCount}</span> cities ·{" "}
          <span className="text-lg font-bold text-primary">{totalDays}</span> days planned
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {selectedCount > 0 && (
            <button
              onClick={() => setClearOpen(true)}
              className="flex items-center gap-1.5 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest text-secondary transition-colors hover:bg-secondary hover:text-white"
            >
              <Trash2 className="size-4" /> Clear
            </button>
          )}
          <button
            disabled={selectedCount < 1}
            onClick={next}
            className="flex flex-1 items-center justify-center gap-2 border-2 border-primary bg-primary-container px-8 py-3 text-sm font-bold uppercase tracking-widest text-primary neo-shadow-hover disabled:opacity-50 sm:flex-none"
          >
            Plan Each City <ArrowRight className="size-4" strokeWidth={3} />
          </button>
        </div>
      </div>

      <AlertDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear all selected places?"
        description={`This removes all ${selectedCount} selected ${
          selectedCount === 1 ? "place" : "places"
        } along with their city plans, hotels and activities. Your destination and region stay.`}
        confirmLabel="Clear all"
        destructive
        onConfirm={clearPlaces}
      />
    </div>
  );
}
