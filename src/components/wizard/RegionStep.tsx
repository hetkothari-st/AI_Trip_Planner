"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Check,
  Plus,
  ChevronRight,
  ArrowRight,
  BadgeCheck,
  Sparkles,
  Zap,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrip, selectedRegions } from "@/lib/store/trip";
import { useTravels } from "@/lib/store/travels";
import { visitedInRegion, remainingSamplePlaces, isPlaceVisited } from "@/lib/travels/types";
import { SEASON_EMOJI, SEASON_MONTHS, SEASON_ORDER, seasonBadge } from "@/lib/season";
import type { Region } from "@/lib/ai/schemas";

export function RegionStep() {
  const store = useTrip();
  const { destination, regions, selectedRegionIds, toggleRegion, setCategories, back, next } = store;
  const { entries } = useTravels();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // AI-discovered "what's left to explore", loaded on demand per region.
  const [aiRemaining, setAiRemaining] = useState<Record<string, string[]>>({});
  const [loadingMore, setLoadingMore] = useState<string | null>(null);

  const chosen = selectedRegions(store);

  async function loadMore(r: Region) {
    setLoadingMore(r.id);
    try {
      const res = await fetch("/api/region-places", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, region: r }),
      });
      if (res.ok) {
        const { places } = (await res.json()) as { places: string[] };
        setAiRemaining((s) => ({
          ...s,
          [r.id]: places.filter((p) => !isPlaceVisited(p, destination, entries)),
        }));
      }
    } finally {
      setLoadingMore(null);
    }
  }

  // Continue with all selected regions: generate travel styles once (from the primary
  // region — the style types generalise across the picked regions) and advance.
  async function proceed() {
    if (chosen.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, region: chosen[0] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data.categories);
      next();
    } catch {
      setError("Couldn’t load travel styles. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // crude "AI recommendation": the region with the strongest single-season desirability.
  const recommended =
    [...regions].sort(
      (a, b) =>
        Math.max(...SEASON_ORDER.map((s) => b.seasonality[s] ?? 0)) -
        Math.max(...SEASON_ORDER.map((s) => a.seasonality[s] ?? 0)),
    )[0] ?? regions[0];

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <button
        onClick={back}
        className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant transition-colors hover:text-primary"
      >
        <span>Explore</span>
        <ChevronRight className="size-3.5" />
        <span className="text-primary">{destination || "Destination"}</span>
      </button>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-6xl font-bold uppercase leading-[0.9] tracking-tighter md:text-8xl">
          Select
          <br />
          Your <span className="text-secondary">Zone.</span>
        </h1>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <p className="max-w-xl border-l-4 border-primary pl-6 text-lg font-medium">
            Analyze {destination}&apos;s distinct belts. Each has its own character and best
            season — pick one or more to combine into a single trip.
          </p>
          {recommended && (
            <div className="flex items-center gap-3 bg-primary px-6 py-3 text-primary-container neo-shadow">
              <Zap className="size-5 shrink-0" fill="currentColor" />
              <span className="text-sm font-bold uppercase tracking-wide">
                AI Rec: {recommended.name} · {seasonBadge(recommended.bestSeason)}
              </span>
            </div>
          )}
        </div>
      </header>

      {error && (
        <p className="mb-6 border-2 border-secondary bg-secondary/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-secondary">
          {error}
        </p>
      )}

      {/* Bento grid of zones */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {regions.map((r) => {
          const max = Math.max(...SEASON_ORDER.map((s) => r.seasonality[s] ?? 0));
          const selected = selectedRegionIds.includes(r.id);
          const visited = visitedInRegion(entries, destination, r.name);
          const remaining = remainingSamplePlaces(r, destination, entries);
          const stillToExplore = aiRemaining[r.id] ?? remaining;
          return (
            <div
              key={r.id}
              className={cn(
                "flex flex-col overflow-hidden border-[3px] border-primary bg-surface-bright transition-all",
                selected ? "neo-shadow" : "neo-shadow-hover",
              )}
            >
              {/* Image header */}
              <button
                type="button"
                onClick={() => toggleRegion(r.id)}
                className="group relative block h-44 w-full overflow-hidden text-left"
              >
                <Image
                  src={`https://picsum.photos/seed/${encodeURIComponent(r.name + destination)}/600/360`}
                  alt={r.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                  className="object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/85 to-transparent" />
                <span className="absolute left-3 top-3 inline-block bg-primary-container px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  {seasonBadge(r.bestSeason)}
                </span>
                {selected && (
                  <span className="absolute right-3 top-3 inline-flex size-7 items-center justify-center border-2 border-primary bg-primary-container text-primary">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                )}
                {visited.length > 0 && (
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-tertiary px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                    <Star className="size-3" fill="currentColor" /> Visited
                  </span>
                )}
                <h3 className="absolute bottom-3 left-3 text-3xl font-bold uppercase leading-none text-white">
                  {r.name}
                </h3>
              </button>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-4 p-5">
                <p className="text-sm font-medium leading-relaxed text-on-surface-variant">
                  {r.blurb}
                </p>

                {/* Visited awareness */}
                {visited.length > 0 && (
                  <div className="border-2 border-tertiary bg-tertiary/10 p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-tertiary">
                      <BadgeCheck className="size-4" />
                      Visited {visited.length} place{visited.length > 1 ? "s" : ""}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
                      {visited.map((v) => v.name).join(", ")}
                    </p>
                    {stillToExplore.length > 0 && (
                      <p className="mt-1.5 text-xs text-on-surface-variant">
                        Still to explore: {stillToExplore.join(", ")}
                      </p>
                    )}
                    {aiRemaining[r.id] === undefined && (
                      <button
                        type="button"
                        onClick={() => loadMore(r)}
                        disabled={loadingMore === r.id}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-tertiary hover:underline disabled:opacity-60"
                      >
                        {loadingMore === r.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        See more
                      </button>
                    )}
                  </div>
                )}

                {/* Seasonality index */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Seasonality Index
                  </p>
                  <div className="flex items-end gap-1.5">
                    {SEASON_ORDER.map((s) => {
                      const v = r.seasonality[s] ?? 0;
                      return (
                        <div key={s} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex h-14 w-full items-end border border-primary bg-surface-container">
                            <div
                              className={cn("w-full", v === max ? "bg-primary" : "bg-primary/40")}
                              style={{ height: `${v}%` }}
                            />
                          </div>
                          <span className="text-[11px] leading-none">{SEASON_EMOJI[s]}</span>
                          <span className="text-[8px] font-bold uppercase leading-tight text-on-surface-variant">
                            {SEASON_MONTHS[s]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Highlights */}
                <div className="flex flex-wrap gap-1.5">
                  {r.highlights.slice(0, 4).map((h) => (
                    <span
                      key={h}
                      className="border border-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <p className="text-xs font-medium text-on-surface-variant">
                  <span className="font-bold text-primary">Sample:</span>{" "}
                  {r.samplePlaces.join(", ")}
                </p>

                {/* Toggle */}
                <button
                  onClick={() => toggleRegion(r.id)}
                  className={cn(
                    "mt-auto flex items-center justify-center gap-2 border-2 border-primary px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors",
                    selected
                      ? "bg-primary-container text-primary"
                      : "bg-primary text-white hover:bg-primary-container hover:text-primary",
                  )}
                >
                  {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
                  {selected ? "Added" : `Add ${r.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky continue bar */}
      <div className="sticky bottom-4 mt-10 flex flex-col items-start justify-between gap-3 border-[3px] border-primary bg-surface p-4 neo-shadow sm:flex-row sm:items-center">
        <p className="text-sm font-medium text-on-surface-variant">
          <span className="text-lg font-bold text-primary">{chosen.length}</span>{" "}
          {chosen.length === 1 ? "zone" : "zones"} selected
          {chosen.length > 0 && (
            <span className="font-bold text-primary"> · {chosen.map((r) => r.name).join(", ")}</span>
          )}
        </p>
        <button
          disabled={chosen.length === 0 || loading}
          onClick={proceed}
          className="flex w-full items-center justify-center gap-2 border-2 border-primary bg-primary-container px-8 py-3 text-sm font-bold uppercase tracking-widest text-primary neo-shadow-hover disabled:opacity-50 sm:w-auto"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" strokeWidth={3} />}
          {loading ? "Loading Styles…" : "Choose Travel Styles"}
        </button>
      </div>
    </div>
  );
}
