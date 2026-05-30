"use client";

import { useState } from "react";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Cpu,
  Landmark,
  Flame,
  Leaf,
  Mountain,
  Building2,
  Waves,
  Utensils,
  Camera,
  Tent,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrip, selectedRegions } from "@/lib/store/trip";

const ICONS: Record<string, typeof Landmark> = {
  landmark: Landmark,
  flame: Flame,
  leaf: Leaf,
  nature: Leaf,
  mountain: Mountain,
  temple: Building2,
  city: Building2,
  water: Waves,
  food: Utensils,
  photo: Camera,
  adventure: Tent,
  explore: Compass,
};

/** Deterministic pseudo "match rate" so each persona card gets a stable badge. */
function matchRate(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 86 + (h % 13); // 86–98%
}

export function CategoryStep() {
  const store = useTrip();
  const { destination, categories, selectedCategoryIds, toggleCategory, setPlaces, back, next } =
    store;
  const chosenRegions = selectedRegions(store);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionLabel =
    chosenRegions.length === 1 ? chosenRegions[0].name : `${chosenRegions.length} regions`;

  // Discover the CITIES/TOWNS to base a stay in, across every selected region × style.
  async function loadCities() {
    if (chosenRegions.length === 0 || selectedCategoryIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, regions: chosenRegions, categoryIds: selectedCategoryIds }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlaces(data.cities);
      next();
    } catch {
      setError("Couldn’t find cities to visit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        <span>{destination || "Destination"}</span>
        <ChevronRight className="size-3.5" />
        <span>{regionLabel}</span>
        <ChevronRight className="size-3.5" />
        <span className="border-b-2 border-secondary pb-0.5 text-primary">Travel Style</span>
      </div>

      {/* Header */}
      <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-5xl font-bold uppercase leading-[0.9] tracking-tighter md:text-7xl">
            Define Your
            <br />
            Travel Persona
          </h1>
          <p className="mt-4 max-w-xl border-l-4 border-tertiary pl-6 text-base font-medium text-on-surface-variant">
            The recommendation engine calibrates its density maps and historical data access
            to your exploration appetite. Choose one or more frequencies.
          </p>
        </div>
        <button
          onClick={back}
          className="flex items-center gap-2 self-start border-2 border-primary bg-surface px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </header>

      {error && (
        <p className="mb-6 border-2 border-secondary bg-secondary/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-secondary">
          {error}
        </p>
      )}

      {/* Persona cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {categories.map((c) => {
          const selected = selectedCategoryIds.includes(c.id);
          const Icon = (c.icon && ICONS[c.icon]) || Landmark;
          return (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={cn(
                "flex flex-col border-[3px] border-primary p-7 text-left transition-all",
                selected ? "bg-primary-container neo-shadow" : "bg-surface-bright neo-shadow-hover",
              )}
            >
              <div className="mb-8 flex items-start justify-between">
                <Icon className="size-10" strokeWidth={2.25} />
                <span className="border-2 border-primary px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                  {matchRate(c.id)}% Match
                </span>
              </div>

              <h3 className="mb-3 text-4xl font-bold uppercase leading-none">{c.label}</h3>
              <p className="mb-6 text-sm font-medium leading-relaxed text-on-surface-variant">
                {c.description}
              </p>

              <div className="mt-auto border-t border-primary/20 bg-surface-container-low p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-tertiary">
                  <Cpu className="size-3.5" /> AI Logic Path
                </p>
                <p className="text-[13px] font-medium italic text-on-surface-variant">
                  Calibrates {c.label.toLowerCase()} density across {regionLabel} using historical
                  access and seasonal data.
                </p>
              </div>

              {selected && (
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                  <Check className="size-4" strokeWidth={3} /> Selected
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t-2 border-primary pt-8 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled={!selectedCategoryIds.length || loading}
            onClick={loadCities}
            className="flex items-center justify-center gap-2 border-2 border-primary bg-tertiary px-10 py-4 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={3} />}
            {loading ? "Finding Cities…" : "Continue to AI Build"}
          </button>
          <span className="text-sm font-medium text-on-surface-variant">
            <span className="text-lg font-bold text-primary">{selectedCategoryIds.length}</span>{" "}
            selected
          </span>
        </div>
        <p className="max-w-xs text-sm font-medium text-on-surface-variant">
          Selected travel style modifies{" "}
          <span className="bg-primary-container px-1 font-bold text-primary">1,400+ variables</span>{" "}
          in the itinerary generation engine.
        </p>
      </div>
    </div>
  );
}
