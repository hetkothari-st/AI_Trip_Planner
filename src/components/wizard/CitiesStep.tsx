"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Clock,
  Utensils,
  Sparkles,
  MapPin,
  Mountain,
  TreePine,
  Landmark,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrip, selectedList } from "@/lib/store/trip";
import type { CitySpot } from "@/lib/ai/schemas";

const SPOT_ICON: Record<CitySpot["category"], typeof MapPin> = {
  sightseeing: Landmark,
  nature: TreePine,
  activity: Mountain,
  food: Utensils,
  spiritual: Flame,
};

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function CitiesStep() {
  const store = useTrip();
  const { destination, cityPlans, setCityPlan, setDays, back, next } = store;
  const places = selectedList(store);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const loadPlan = useCallback(
    async (id: string, city: string, days: number) => {
      setLoading((l) => ({ ...l, [id]: true }));
      try {
        const res = await fetch("/api/city-plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ destination, city, days }),
        });
        if (res.ok) {
          const data = await res.json();
          setCityPlan(id, data.plan);
        }
      } finally {
        setLoading((l) => ({ ...l, [id]: false }));
      }
    },
    [destination, setCityPlan],
  );

  // Auto-fetch a plan for each selected city once.
  useEffect(() => {
    places.forEach((p) => {
      if (!cityPlans[p.id] && !loading[p.id]) loadPlan(p.id, p.name, p.days);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.length]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Plan each city</h1>
          <p className="mt-1 text-muted-foreground">
            For every stop we recommend how long to stay and a day-by-day mini-itinerary —
            spots, timings, local food, and what each place is famous for.
          </p>
        </div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      <div className="space-y-6">
        {places.map((p) => {
          const plan = cityPlans[p.id];
          const isLoading = loading[p.id];
          const spotsPerDay = plan ? Math.ceil(plan.spots.length / p.days) : 0;
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {/* header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-primary" />
                  <h2 className="font-serif text-xl font-semibold">{p.name}</h2>
                  {plan && (
                    <Badge variant="muted" className="ml-1">
                      <Sparkles className="mr-1 size-3" /> AI suggests {plan.recommendedDays}{" "}
                      {plan.recommendedDays === 1 ? "day" : "days"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Staying</span>
                  <div className="flex items-center rounded-md border">
                    <button
                      className="px-2.5 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setDays(p.id, p.days - 1)}
                      aria-label="Fewer days"
                    >
                      −
                    </button>
                    <span className="min-w-[60px] text-center text-sm font-medium">
                      {p.days} {p.days === 1 ? "day" : "days"}
                    </span>
                    <button
                      className="px-2.5 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setDays(p.id, p.days + 1)}
                      aria-label="More days"
                    >
                      +
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadPlan(p.id, p.name, p.days)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Refresh plan"}
                  </Button>
                </div>
              </div>

              {/* body */}
              <div className="p-4">
                {!plan && isLoading && (
                  <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Building {p.name}&apos;s
                    itinerary from web, YouTube &amp; Reddit…
                  </div>
                )}

                {plan && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                    {/* day-by-day spots */}
                    <div className="space-y-5">
                      {Array.from({ length: p.days }).map((_, dayIdx) => {
                        const daySpots = plan.spots.slice(
                          dayIdx * spotsPerDay,
                          (dayIdx + 1) * spotsPerDay,
                        );
                        if (daySpots.length === 0) return null;
                        const dayMin = daySpots.reduce((n, s) => n + s.durationMin, 0);
                        return (
                          <div key={dayIdx}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                {dayIdx + 1}
                              </span>
                              <h3 className="font-semibold">Day {dayIdx + 1}</h3>
                              <span className="text-xs text-muted-foreground">
                                · ~{fmtMin(dayMin)} of activities
                              </span>
                            </div>
                            <ol className="ml-3 space-y-2 border-l pl-4">
                              {daySpots.map((s, i) => {
                                const Icon = SPOT_ICON[s.category];
                                return (
                                  <li key={i} className="relative">
                                    <span className="absolute -left-[22px] top-1 flex size-3.5 items-center justify-center rounded-full bg-background ring-2 ring-primary/40" />
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="flex items-center gap-1.5 font-medium">
                                          <Icon className="size-3.5 text-primary" />
                                          {s.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {s.description}
                                        </p>
                                      </div>
                                      <Badge variant="muted" className="shrink-0">
                                        <Clock className="mr-1 size-3" />
                                        {fmtMin(s.durationMin)}
                                      </Badge>
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        );
                      })}
                    </div>

                    {/* sidebar: food + famous-for */}
                    <aside className="space-y-4">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Famous for
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.famousFor.map((f) => (
                            <Badge key={f} variant="secondary">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Utensils className="size-3.5" /> Must-try local food
                        </p>
                        <ul className="space-y-1 text-sm">
                          {plan.localFood.map((f) => (
                            <li key={f}>• {f}</li>
                          ))}
                        </ul>
                      </div>

                      {plan.foodPlaces.length > 0 && (
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Where to eat
                          </p>
                          <ul className="space-y-2 text-sm">
                            {plan.foodPlaces.map((fp) => (
                              <li key={fp.name}>
                                <span className="font-medium">{fp.name}</span> — {fp.dish}
                                {fp.note && (
                                  <span className="block text-xs text-muted-foreground">
                                    {fp.note}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </aside>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-4 mt-8 flex items-center justify-between rounded-xl border bg-card/90 p-4 shadow-lg backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {places.length} cities · {places.reduce((n, p) => n + p.days, 0)} days total
        </p>
        <Button size="lg" onClick={next}>
          View route on map <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
