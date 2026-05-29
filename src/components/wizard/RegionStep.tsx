"use client";

import { useState } from "react";
import { Loader2, Check, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTrip } from "@/lib/store/trip";
import { SEASON_EMOJI, SEASON_LABEL, SEASON_ORDER } from "@/lib/season";
import type { Region } from "@/lib/ai/schemas";

export function RegionStep() {
  const { destination, regions, region, chooseRegion, setCategories, back, next } = useTrip();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(r: Region) {
    chooseRegion(r);
    setLoadingId(r.id);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, region: r }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data.categories);
      next();
    } catch {
      setError("Couldn’t load travel styles for that region. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Which part of {destination}?
          </h1>
          <p className="mt-1 text-muted-foreground">
            Each belt has its own character and best season. Pick one to continue.
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
          const selected = region?.id === r.id;
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
                  <Badge variant="secondary">
                    {SEASON_EMOJI[r.bestSeason]} {SEASON_LABEL[r.bestSeason]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.blurb}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
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
                          <span className="text-[10px] text-muted-foreground">{SEASON_EMOJI[s]}</span>
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
                  onClick={() => pick(r)}
                  disabled={loadingId !== null}
                >
                  {loadingId === r.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : selected ? (
                    <Check className="size-4" />
                  ) : null}
                  {loadingId === r.id ? "Loading styles" : `Explore ${r.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
