"use client";

import { useState } from "react";
import { Loader2, Check, Plus, ArrowLeft, ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Which parts of {destination}?
          </h1>
          <p className="mt-1 text-muted-foreground">
            Each belt has its own character and best season. Pick one or more to combine
            into a single trip.
          </p>
        </div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {regions.map((r) => {
          const max = Math.max(...SEASON_ORDER.map((s) => r.seasonality[s] ?? 0));
          const selected = selectedRegionIds.includes(r.id);
          const visited = visitedInRegion(entries, destination, r.name);
          const remaining = remainingSamplePlaces(r, destination, entries);
          return (
            <Card
              key={r.id}
              className={cn(
                "flex flex-col hover:shadow-md",
                selected && "ring-2 ring-primary",
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-serif text-xl">{r.name}</CardTitle>
                  <Badge variant="secondary">{seasonBadge(r.bestSeason)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.blurb}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {/* Already-visited awareness from the bucket list */}
                {visited.length > 0 && (
                  <div className="rounded-lg border border-emerald-600/30 bg-emerald-50 p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                      <BadgeCheck className="size-4" />
                      You&apos;ve visited {visited.length} place
                      {visited.length > 1 ? "s" : ""} here
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700/80">
                      {visited.map((v) => v.name).join(", ")}
                    </p>
                    {(aiRemaining[r.id] ?? remaining).length > 0 && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Still to explore: {(aiRemaining[r.id] ?? remaining).join(", ")}
                      </p>
                    )}
                    {aiRemaining[r.id] === undefined && (
                      <button
                        type="button"
                        onClick={() => loadMore(r)}
                        disabled={loadingMore === r.id}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
                      >
                        {loadingMore === r.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        See more places to explore
                      </button>
                    )}
                  </div>
                )}

                {/* Seasonality index */}
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Seasonality index
                  </p>
                  <div className="flex items-end gap-1.5">
                    {SEASON_ORDER.map((s) => {
                      const v = r.seasonality[s] ?? 0;
                      return (
                        <div key={s} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex h-16 w-full items-end rounded bg-muted">
                            <div
                              className={cn(
                                "w-full rounded",
                                v === max ? "bg-primary" : "bg-primary/40",
                              )}
                              style={{ height: `${v}%` }}
                            />
                          </div>
                          <span className="text-[11px] leading-none">{SEASON_EMOJI[s]}</span>
                          <span className="text-[9px] leading-tight text-muted-foreground">
                            {SEASON_MONTHS[s]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Likings / highlights */}
                <div className="flex flex-wrap gap-1.5">
                  {r.highlights.slice(0, 4).map((h) => (
                    <Badge key={h} variant="muted">
                      {h}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Sample places: {r.samplePlaces.join(", ")}
                </p>

                <Button
                  className="mt-auto"
                  variant={selected ? "secondary" : "default"}
                  onClick={() => toggleRegion(r.id)}
                >
                  {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
                  {selected ? "Added" : `Add ${r.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* sticky continue bar */}
      <div className="sticky bottom-4 mt-10 flex items-center justify-between gap-3 rounded-xl border bg-card/90 p-4 shadow-lg backdrop-blur">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{chosen.length}</span>{" "}
          {chosen.length === 1 ? "region" : "regions"} selected
          {chosen.length > 0 && <> · {chosen.map((r) => r.name).join(", ")}</>}
        </p>
        <Button size="lg" disabled={chosen.length === 0 || loading} onClick={proceed}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {loading ? "Loading styles…" : "Choose travel styles"}
        </Button>
      </div>
    </div>
  );
}
