"use client";

import { useState } from "react";
import { Loader2, Star, Check, ExternalLink, BadgeCheck, ChevronDown, MapPin, Navigation } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn, estTravel, formatDuration } from "@/lib/utils";
import { useTrip, selectedSpotsOf, roomsFor } from "@/lib/store/trip";
import { formatINR } from "@/lib/cost";
import type { Hotel } from "@/lib/hotels/types";

export function HotelPanel({
  placeId,
  city,
  nights,
  cityLat,
  cityLng,
}: {
  placeId: string;
  city: string;
  nights: number;
  cityLat?: number;
  cityLng?: number;
}) {
  const store = useTrip();
  const { destination, hotels, setHotel, travellers } = store;
  const chosen = hotels[placeId];
  const rooms = roomsFor(travellers);

  // The user's kept spots for this city that have coordinates — for hotel→spot distances.
  const plan = store.cityPlans[placeId];
  const spots = plan
    ? selectedSpotsOf(store, placeId, plan).filter((s) => s.lat != null && s.lng != null)
    : [];

  const [budgetMax, setBudgetMax] = useState(8000);
  const [minStars, setMinStars] = useState(3);
  const [list, setList] = useState<Hotel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [spotsOpen, setSpotsOpen] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch("/api/hotels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, city, budgetMax, minStars, nights, cityLat, cityLng }),
      });
      if (res.ok) setList((await res.json()).hotels);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
        Pricing for {travellers} {travellers === 1 ? "traveller" : "travellers"} · {rooms}{" "}
        {rooms === 1 ? "room" : "rooms"} (2 per room)
      </p>
      {/* filters */}
      <div className="flex flex-wrap items-end gap-5 border-2 border-primary bg-surface-container p-4">
        <div className="min-w-[220px] flex-1">
          <label className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide">
            Max per night <span className="text-tertiary">{formatINR(budgetMax)}</span>
          </label>
          <Slider
            min={1500}
            max={20000}
            step={500}
            value={[budgetMax]}
            onValueChange={([v]) => setBudgetMax(v)}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide">Min rating</label>
          <div className="flex gap-1">
            {[3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setMinStars(s)}
                className={cn(
                  "flex items-center gap-1 border-2 border-primary px-2.5 py-1.5 text-sm font-bold transition-colors",
                  minStars === s ? "bg-primary-container text-primary" : "bg-surface hover:bg-surface-container-high",
                )}
              >
                {s}
                <Star className="size-3.5 fill-current" />
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="flex items-center gap-2 border-2 border-primary bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-tertiary disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {list ? "Update" : "Find Hotels"}
        </button>
      </div>

      {loading && !list && (
        <p className="flex items-center gap-2 py-4 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
          <Loader2 className="size-4 animate-spin" /> Comparing hotels across booking sites…
        </p>
      )}

      {list && list.length === 0 && (
        <p className="py-4 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
          No hotels within {formatINR(budgetMax)}/night — raise the budget.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list?.map((h) => {
          const isChosen = chosen?.id === h.id;
          const isOpen = expanded === h.id;
          return (
            <div
              key={h.id}
              className={cn(
                "flex flex-col overflow-hidden border-2 border-primary bg-surface-container-lowest",
                isChosen && "neo-shadow",
              )}
            >
              <div className="flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.imageUrl} alt={h.name} className="h-24 w-28 shrink-0 border-2 border-primary object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: h.stars }).map((_, i) => (
                      <Star key={i} className="size-3 fill-primary-fixed-dim text-primary-fixed-dim" />
                    ))}
                    <span className="ml-1 text-[10px] font-bold uppercase text-on-surface-variant">{h.rating}/5</span>
                  </div>
                  <h4 className="truncate text-base font-bold uppercase">{h.name}</h4>
                  <p className="flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                    <MapPin className="size-3" /> {h.area} · {h.distanceToCenterKm.toFixed(1)} km from centre
                  </p>
                  <div className="mt-1">
                    <span className="text-lg font-bold">{formatINR(h.pricePerNight)}</span>
                    <span className="text-[11px] font-medium text-on-surface-variant">
                      {" "}
                      /night/room{rooms > 1 ? ` · ${rooms} rooms` : ""} · best on {h.bestPriceSite}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 px-3">
                {h.amenities.slice(0, 5).map((a) => (
                  <span key={a} className="border border-primary px-1.5 py-0.5 text-[10px] font-bold uppercase">
                    {a}
                  </span>
                ))}
              </div>

              {/* price comparison */}
              <button
                onClick={() => setExpanded(isOpen ? null : h.id)}
                className="mt-2 flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wide text-tertiary hover:bg-surface-container"
              >
                Compare {h.prices.length} sites
                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <ul className="space-y-1 px-3 pb-2 text-sm">
                  {h.prices.map((p, i) => (
                    <li key={p.site} className="flex items-center justify-between gap-2">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-medium hover:underline"
                      >
                        {p.site} <ExternalLink className="size-3" />
                      </a>
                      <span className={cn("font-bold", i === 0 && "text-tertiary")}>
                        {formatINR(p.price)}
                        {i === 0 && <BadgeCheck className="ml-1 inline size-3.5" />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* travel time + distance from this hotel to each kept spot */}
              {spots.length > 0 && (
                <>
                  <button
                    onClick={() => setSpotsOpen(spotsOpen === h.id ? null : h.id)}
                    className="flex items-center justify-between border-t-2 border-primary/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-tertiary hover:bg-surface-container"
                  >
                    <span className="flex items-center gap-1">
                      <Navigation className="size-3.5" /> Distance to your {spots.length} spots
                    </span>
                    <ChevronDown className={cn("size-4 transition-transform", spotsOpen === h.id && "rotate-180")} />
                  </button>
                  {spotsOpen === h.id && (
                    <ul className="space-y-1 px-3 pb-2 text-sm">
                      {spots
                        .map((s) => ({ s, t: estTravel(h, { lat: s.lat!, lng: s.lng! }) }))
                        .sort((a, b) => a.t.distanceKm - b.t.distanceKm)
                        .map(({ s, t }) => (
                          <li key={s.name} className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{s.name}</span>
                            <span className="shrink-0 text-on-surface-variant">
                              {t.distanceKm.toFixed(1)} km · {formatDuration(t.durationSec)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}

              <div className="mt-auto p-3 pt-1">
                <button
                  onClick={() => setHotel(placeId, isChosen ? null : h)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 border-2 border-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors",
                    isChosen
                      ? "bg-primary text-white hover:bg-secondary"
                      : "bg-primary-container text-primary hover:bg-primary hover:text-white",
                  )}
                >
                  {isChosen ? <Check className="size-4" strokeWidth={3} /> : null}
                  {isChosen
                    ? `Selected · ${formatINR(h.pricePerNight * nights * rooms)} · ${nights} nights × ${rooms} ${rooms === 1 ? "room" : "rooms"}`
                    : "Select Hotel"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
