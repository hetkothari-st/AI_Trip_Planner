"use client";

import { useState } from "react";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Landmark,
  Flame,
  Leaf,
  Mountain,
  Building2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrip } from "@/lib/store/trip";

const ICONS: Record<string, typeof Landmark> = {
  landmark: Landmark,
  flame: Flame,
  leaf: Leaf,
  mountain: Mountain,
  temple: Building2,
};

export function CategoryStep() {
  const {
    destination,
    region,
    categories,
    selectedCategoryIds,
    toggleCategory,
    setPlaces,
    back,
    next,
  } = useTrip();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPlaces() {
    if (!region || selectedCategoryIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, region, categoryIds: selectedCategoryIds }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlaces(data.places);
      next();
    } catch {
      setError("Couldn’t fetch ranked places. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            How do you want to explore {region?.name}?
          </h1>
          <p className="mt-1 text-muted-foreground">
            Pick one or more styles — these are tailored to this region, not a fixed list.
            You can mix and match (e.g. popular spots + a few offbeat ones).
          </p>
        </div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const Icon = (c.icon && ICONS[c.icon]) || Landmark;
          const selected = selectedCategoryIds.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={cn(
                "group relative rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:shadow-md",
                selected && "ring-2 ring-primary",
              )}
            >
              {selected && (
                <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" />
                </span>
              )}
              <div className="mb-3 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold">{c.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedCategoryIds.length} selected
        </p>
        <Button size="lg" disabled={selectedCategoryIds.length === 0 || loading} onClick={loadPlaces}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {loading ? "Searching the web…" : "Find top places"}
        </Button>
      </div>
    </div>
  );
}
