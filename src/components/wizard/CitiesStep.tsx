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
  BedDouble,
  Check,
  Map as MapTab,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HotelPanel } from "@/components/hotels/HotelPanel";
import { ActivitiesPanel } from "@/components/activities/ActivitiesPanel";
import { CostSummary } from "@/components/cost/CostSummary";
import { cn } from "@/lib/utils";
import { useTrip, selectedList, suggestedDays } from "@/lib/store/trip";
import { formatINR } from "@/lib/cost";
import type { CitySpot } from "@/lib/ai/schemas";

const SPOT_ICON: Record<CitySpot["category"], typeof MapPin> = {
  sightseeing: Landmark,
  nature: TreePine,
  activity: Mountain,
  food: Utensils,
  spiritual: Flame,
};

type Tab = "itinerary" | "hotels" | "activities";

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function CitiesStep() {
  const store = useTrip();
  const { destination, cityPlans, setCityPlan, selectedSpots, toggleSpot, hotels, activities, setDays, back, next } =
    store;
  const places = selectedList(store);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [tabs, setTabs] = useState<Record<string, Tab>>({});

  const loadPlan = useCallback(
    async (id: string, city: string, days: number) => {
      setLoading((l) => ({ ...l, [id]: true }));
      try {
        const res = await fetch("/api/city-plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ destination, city, days }),
        });
        if (res.ok) setCityPlan(id, (await res.json()).plan);
      } finally {
        setLoading((l) => ({ ...l, [id]: false }));
      }
    },
    [destination, setCityPlan],
  );

  useEffect(() => {
    places.forEach((p) => {
      if (!cityPlans[p.id] && !loading[p.id]) loadPlan(p.id, p.name, p.days);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.length]);

  const tabOf = (id: string): Tab => tabs[id] ?? "itinerary";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Plan each city</h1>
          <p className="mt-1 text-muted-foreground">
            A day-by-day mini-itinerary, hotels with live price comparison, and curated
            activities for every stop — costs add up live on the right.
          </p>
        </div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {places.map((p) => {
            const plan = cityPlans[p.id];
            const isLoading = loading[p.id];
            const keptNames = plan ? selectedSpots[p.id] ?? plan.spots.map((s) => s.name) : [];
            const sugg = suggestedDays(keptNames.length);
            const tab = tabOf(p.id);
            const hotel = hotels[p.id];
            const acts = activities[p.id] ?? [];

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
                      <button className="px-2.5 py-1.5 text-sm hover:bg-muted" onClick={() => setDays(p.id, p.days - 1)} aria-label="Fewer days">
                        −
                      </button>
                      <span className="min-w-[60px] text-center text-sm font-medium">
                        {p.days} {p.days === 1 ? "day" : "days"}
                      </span>
                      <button className="px-2.5 py-1.5 text-sm hover:bg-muted" onClick={() => setDays(p.id, p.days + 1)} aria-label="More days">
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* tab bar */}
                <div className="flex gap-1 border-b px-4 pt-2">
                  {(
                    [
                      { id: "itinerary" as Tab, label: "Itinerary", icon: MapTab },
                      { id: "hotels" as Tab, label: hotel ? "Hotel ✓" : "Hotels", icon: BedDouble },
                      { id: "activities" as Tab, label: acts.length ? `Activities (${acts.length})` : "Activities", icon: Mountain },
                    ]
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTabs((s) => ({ ...s, [p.id]: t.id }))}
                      className={cn(
                        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                        tab === t.id
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <t.icon className="size-4" /> {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {tab === "itinerary" && (
                    <>
                      {!plan && isLoading && (
                        <div className="flex items-center gap-2 py-8 text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" /> Building {p.name}&apos;s
                          itinerary…
                        </div>
                      )}
                      {plan && (
                        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{keptNames.length}</span> of{" "}
                                {plan.spots.length} spots · AI suggests{" "}
                                <span className="font-medium text-foreground">{sugg}d</span>
                              </p>
                              {p.days !== sugg && (
                                <Button variant="outline" size="sm" onClick={() => setDays(p.id, sugg)}>
                                  Use {sugg} {sugg === 1 ? "day" : "days"}
                                </Button>
                              )}
                            </div>
                            <ul className="space-y-2">
                              {plan.spots.map((s, i) => {
                                const Icon = SPOT_ICON[s.category];
                                const on = keptNames.includes(s.name);
                                return (
                                  <li key={i}>
                                    <button
                                      type="button"
                                      onClick={() => toggleSpot(p.id, s.name)}
                                      className={cn(
                                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                                        on
                                          ? "border-primary bg-primary/5"
                                          : "border-border opacity-60 hover:opacity-100",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                                          on
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-muted-foreground/40",
                                        )}
                                      >
                                        {on && <Check className="size-3" />}
                                      </span>
                                      <div className="flex-1">
                                        <p className="flex items-center gap-1.5 font-medium">
                                          <Icon className="size-3.5 text-primary" />
                                          {s.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{s.description}</p>
                                      </div>
                                      <Badge variant="muted" className="shrink-0">
                                        <Clock className="mr-1 size-3" />
                                        {fmtMin(s.durationMin)}
                                      </Badge>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          <aside className="space-y-4">
                            <div className="rounded-lg border bg-muted/20 p-3">
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Famous for</p>
                              <div className="flex flex-wrap gap-1.5">
                                {plan.famousFor.map((f) => (
                                  <Badge key={f} variant="secondary">{f}</Badge>
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
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Where to eat</p>
                                <ul className="space-y-2 text-sm">
                                  {plan.foodPlaces.map((fp) => (
                                    <li key={fp.name}>
                                      <span className="font-medium">{fp.name}</span> — {fp.dish}
                                      {fp.note && <span className="block text-xs text-muted-foreground">{fp.note}</span>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </aside>
                        </div>
                      )}
                    </>
                  )}

                  {tab === "hotels" && <HotelPanel placeId={p.id} city={p.name} nights={p.days} />}
                  {tab === "activities" && <ActivitiesPanel placeId={p.id} city={p.name} />}
                </div>

                {/* selection footer */}
                {(hotel || acts.length > 0) && (
                  <div className="flex flex-wrap items-center gap-3 border-t bg-muted/20 px-4 py-2 text-sm">
                    {hotel && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="size-3.5 text-primary" /> {hotel.name} ·{" "}
                        {formatINR(hotel.pricePerNight * p.days)}
                      </span>
                    )}
                    {acts.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Mountain className="size-3.5 text-primary" /> {acts.length} activities
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* sticky cost rail */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CostSummary />
        </aside>
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
