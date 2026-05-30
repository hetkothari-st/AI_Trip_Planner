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
  Minus,
  Plus,
  Map as MapTab,
} from "lucide-react";
import { HotelPanel } from "@/components/hotels/HotelPanel";
import { ActivitiesPanel } from "@/components/activities/ActivitiesPanel";
import { CityMiniMap } from "@/components/map/CityMiniMap";
import { CostSummary } from "@/components/cost/CostSummary";
import { cn } from "@/lib/utils";
import { useTrip, selectedList, selectedSpotsOf, suggestedDays } from "@/lib/store/trip";
import { formatINR } from "@/lib/cost";
import type { CitySpot } from "@/lib/ai/schemas";

const SPOT_ICON: Record<CitySpot["category"], typeof MapPin> = {
  sightseeing: Landmark,
  nature: TreePine,
  activity: Mountain,
  food: Utensils,
  spiritual: Flame,
};

type Tab = "itinerary" | "hotels" | "activities" | "map";

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

  const TABS: { id: Tab; label: (h: boolean, n: number) => string; icon: typeof Sparkles }[] = [
    { id: "itinerary", label: () => "Itinerary", icon: Sparkles },
    { id: "hotels", label: (h) => (h ? "Hotel ✓" : "Hotels"), icon: BedDouble },
    { id: "activities", label: (_h, n) => (n ? `Activities (${n})` : "Activities"), icon: Mountain },
    { id: "map", label: () => "Map", icon: MapTab },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-6xl font-bold uppercase leading-[0.85] tracking-tighter md:text-7xl">
            Plan Each
            <br />
            City
          </h1>
          <p className="mt-4 max-w-xl border-l-4 border-primary pl-6 text-base font-medium text-on-surface-variant">
            Day-by-day mini-itineraries, hotels with live price comparison, and curated
            activities — costs add up live on the right.
          </p>
        </div>
        <button
          onClick={back}
          className="flex items-center gap-2 self-start border-2 border-primary bg-surface px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {places.map((p) => {
            const plan = cityPlans[p.id];
            const isLoading = loading[p.id];
            const keptNames = plan ? selectedSpots[p.id] ?? plan.spots.map((s) => s.name) : [];
            const sugg = suggestedDays(keptNames.length);
            const tab = tabOf(p.id);
            const hotel = hotels[p.id];
            const acts = activities[p.id] ?? [];

            return (
              <div key={p.id} className="overflow-hidden border-[3px] border-primary bg-surface-bright neo-shadow">
                {/* header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-primary bg-primary p-5 text-white">
                  <div className="flex items-center gap-3">
                    <MapPin className="size-6 text-primary-container" />
                    <h2 className="text-3xl font-bold uppercase tracking-tighter">{p.name}</h2>
                    {plan && (
                      <span className="flex items-center gap-1 bg-primary-container px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                        <Sparkles className="size-3" /> AI: {plan.recommendedDays}
                        {plan.recommendedDays === 1 ? "d" : "d"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Staying</span>
                    <div className="flex items-center border-2 border-white">
                      <button
                        className="flex size-8 items-center justify-center hover:bg-white hover:text-primary"
                        onClick={() => setDays(p.id, p.days - 1)}
                        aria-label="Fewer days"
                      >
                        <Minus className="size-3.5" strokeWidth={3} />
                      </button>
                      <span className="min-w-[56px] text-center text-sm font-bold">
                        {p.days} {p.days === 1 ? "day" : "days"}
                      </span>
                      <button
                        className="flex size-8 items-center justify-center hover:bg-white hover:text-primary"
                        onClick={() => setDays(p.id, p.days + 1)}
                        aria-label="More days"
                      >
                        <Plus className="size-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* tab bar */}
                <div className="flex flex-wrap gap-0 border-b-[3px] border-primary">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTabs((s) => ({ ...s, [p.id]: t.id }))}
                        className={cn(
                          "flex items-center gap-1.5 border-r-2 border-primary px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors",
                          active
                            ? "bg-primary-container text-primary"
                            : "bg-surface-bright text-on-surface-variant hover:bg-surface-container",
                        )}
                      >
                        <t.icon className="size-4" /> {t.label(!!hotel, acts.length)}
                      </button>
                    );
                  })}
                </div>

                <div className="p-5">
                  {tab === "itinerary" && (
                    <>
                      {!plan && isLoading && (
                        <div className="flex items-center gap-2 py-8 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                          <Loader2 className="size-4 animate-spin" /> Building {p.name}&apos;s itinerary…
                        </div>
                      )}
                      {plan && (
                        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                <span className="text-primary">{keptNames.length}</span> of {plan.spots.length} spots ·
                                AI suggests <span className="text-primary">{sugg}d</span>
                              </p>
                              {p.days !== sugg && (
                                <button
                                  onClick={() => setDays(p.id, sugg)}
                                  className="border-2 border-primary bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-wide hover:bg-primary-container"
                                >
                                  Use {sugg} {sugg === 1 ? "day" : "days"}
                                </button>
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
                                        "flex w-full items-start gap-3 border-2 border-primary p-3 text-left transition-all",
                                        on ? "bg-primary-container" : "bg-surface-container-lowest opacity-60 hover:opacity-100",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 border-primary",
                                          on ? "bg-primary text-white" : "bg-surface",
                                        )}
                                      >
                                        {on && <Check className="size-3" strokeWidth={3} />}
                                      </span>
                                      <div className="flex-1">
                                        <p className="flex items-center gap-1.5 font-bold uppercase">
                                          <Icon className="size-3.5" />
                                          {s.name}
                                        </p>
                                        <p className="text-sm font-medium text-on-surface-variant">{s.description}</p>
                                      </div>
                                      <span className="flex shrink-0 items-center gap-1 border border-primary px-1.5 py-0.5 text-[10px] font-bold uppercase">
                                        <Clock className="size-3" />
                                        {fmtMin(s.durationMin)}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          <aside className="space-y-4">
                            <div className="border-2 border-primary bg-surface-container p-3">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                Famous for
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {plan.famousFor.map((f) => (
                                  <span key={f} className="bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="border-2 border-primary bg-surface-container p-3">
                              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                <Utensils className="size-3.5" /> Must-try local food
                              </p>
                              <ul className="space-y-1 text-sm font-medium">
                                {plan.localFood.map((f) => (
                                  <li key={f}>• {f}</li>
                                ))}
                              </ul>
                            </div>
                            {plan.foodPlaces.length > 0 && (
                              <div className="border-2 border-primary bg-surface-container p-3">
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                  Where to eat
                                </p>
                                <ul className="space-y-2 text-sm">
                                  {plan.foodPlaces.map((fp) => (
                                    <li key={fp.name}>
                                      <span className="font-bold">{fp.name}</span> — {fp.dish}
                                      {fp.note && (
                                        <span className="block text-xs text-on-surface-variant">{fp.note}</span>
                                      )}
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

                  {tab === "hotels" && (
                    <HotelPanel placeId={p.id} city={p.name} nights={p.days} cityLat={p.lat} cityLng={p.lng} />
                  )}
                  {tab === "activities" && (
                    <ActivitiesPanel placeId={p.id} city={p.name} cityLat={p.lat} cityLng={p.lng} />
                  )}
                  {tab === "map" && (
                    <CityMiniMap
                      hotel={hotel ? { name: hotel.name, lat: hotel.lat, lng: hotel.lng } : undefined}
                      spots={
                        plan
                          ? selectedSpotsOf(store, p.id, plan)
                              .filter((s) => s.lat != null && s.lng != null)
                              .map((s) => ({ name: s.name, lat: s.lat!, lng: s.lng! }))
                          : []
                      }
                      activities={acts
                        .filter((a) => a.lat != null && a.lng != null)
                        .map((a) => ({ name: a.name, lat: a.lat!, lng: a.lng! }))}
                    />
                  )}
                </div>

                {/* selection footer */}
                {(hotel || acts.length > 0) && (
                  <div className="flex flex-wrap items-center gap-4 border-t-2 border-primary bg-surface-container px-5 py-3 text-sm font-bold">
                    {hotel && (
                      <span className="flex items-center gap-1.5">
                        <BedDouble className="size-4 text-tertiary" /> {hotel.name} ·{" "}
                        {formatINR(hotel.pricePerNight * p.days)}
                      </span>
                    )}
                    {acts.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Mountain className="size-4 text-tertiary" /> {acts.length} activities
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* sticky cost rail */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CostSummary />
        </aside>
      </div>

      <div className="sticky bottom-4 mt-8 flex flex-col items-start justify-between gap-3 border-[3px] border-primary bg-surface p-4 neo-shadow sm:flex-row sm:items-center">
        <p className="text-sm font-medium text-on-surface-variant">
          <span className="text-lg font-bold text-primary">{places.length}</span> cities ·{" "}
          <span className="text-lg font-bold text-primary">{places.reduce((n, p) => n + p.days, 0)}</span> days total
        </p>
        <button
          onClick={next}
          className="flex w-full items-center justify-center gap-2 border-2 border-primary bg-primary-container px-8 py-3 text-sm font-bold uppercase tracking-widest text-primary neo-shadow-hover sm:w-auto"
        >
          View Route on Map <ArrowRight className="size-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
