"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, MapPinned, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Choose cities to visit
          </h1>
          <p className="mt-1 text-muted-foreground">
            Towns and bases across your selected regions, by style. Add the ones you want —
            we suggest how many days each needs, and you can adjust.
          </p>
        </div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      <div className="space-y-12">
        {regionGroups.map(({ region: rg, catGroups }) => (
          <div key={rg.id} className="space-y-8">
            <div className="flex items-center gap-3 border-b pb-2">
              <MapPinned className="size-5 text-primary" />
              <h2 className="font-serif text-2xl font-semibold">{rg.name}</h2>
            </div>
            {catGroups.map(({ catId, cities }) => (
              <section key={catId}>
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="font-semibold">{labelFor(catId)}</h3>
                  <Badge variant="muted">{cities.length} cities</Badge>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* sticky action bar */}
      <div className="sticky bottom-4 mt-10 flex items-center justify-between gap-3 rounded-xl border bg-card/90 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <MapPinned className="size-4 text-primary" />
          <span className="font-medium">{selectedCount}</span> places ·{" "}
          <span className="font-medium">
            {Object.values(selected).reduce((n, p) => n + p.days, 0)}
          </span>{" "}
          days planned
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setClearOpen(true)}>
              <Trash2 className="size-4 text-destructive" /> Clear all
            </Button>
          )}
          <Button size="lg" disabled={selectedCount < 1} onClick={next}>
            Plan each city <ArrowRight className="size-4" />
          </Button>
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
