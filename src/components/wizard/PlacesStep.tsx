"use client";

import { ArrowLeft, ArrowRight, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaceBanner } from "@/components/places/PlaceBanner";
import { useTrip } from "@/lib/store/trip";

export function PlacesStep() {
  const {
    region,
    categories,
    places,
    selected,
    togglePlace,
    setDays,
    back,
    next,
  } = useTrip();

  const labelFor = (id: string) =>
    categories.find((c) => c.id === id)?.label ?? id.replace(/-/g, " ");

  // group places by their category bucket, preserving rank order
  const groups = places.reduce<Record<string, typeof places>>((acc, p) => {
    (acc[p.categoryId] ??= []).push(p);
    return acc;
  }, {});

  const selectedCount = Object.keys(selected).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Top places in {region?.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Ranked from across the web, YouTube and Reddit. Pick places from any section —
            set how many days you’ll spend at each.
          </p>
        </div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      <div className="space-y-10">
        {Object.entries(groups).map(([catId, list]) => (
          <section key={catId}>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-serif text-xl font-semibold">{labelFor(catId)}</h2>
              <Badge variant="muted">{list.length} places</Badge>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <PlaceBanner
                  key={p.id}
                  place={p}
                  selected={!!selected[p.id]}
                  days={selected[p.id]?.days ?? 1}
                  onToggle={() => togglePlace(p)}
                  onDays={(d) => setDays(p.id, d)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* sticky action bar */}
      <div className="sticky bottom-4 mt-10 flex items-center justify-between rounded-xl border bg-card/90 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <MapPinned className="size-4 text-primary" />
          <span className="font-medium">{selectedCount}</span> places ·{" "}
          <span className="font-medium">
            {Object.values(selected).reduce((n, p) => n + p.days, 0)}
          </span>{" "}
          days planned
        </div>
        <Button size="lg" disabled={selectedCount < 1} onClick={next}>
          View route on map <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
