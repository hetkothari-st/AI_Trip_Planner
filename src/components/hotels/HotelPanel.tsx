"use client";

import { useState } from "react";
import { Loader2, Star, Check, ExternalLink, BadgeCheck, ChevronDown, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn, estTravel, formatDuration } from "@/lib/utils";
import { useTrip, selectedSpotsOf } from "@/lib/store/trip";
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
  const { destination, hotels, setHotel } = store;
  const chosen = hotels[placeId];

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
      {/* filters */}
      <div className="flex flex-wrap items-end gap-5 rounded-lg border bg-muted/20 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="mb-2 flex items-center justify-between text-sm font-medium">
            Max per night <span className="text-primary">{formatINR(budgetMax)}</span>
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
          <label className="mb-2 block text-sm font-medium">Min rating</label>
          <div className="flex gap-1">
            {[3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setMinStars(s)}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm",
                  minStars === s ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                {s}
                <Star className="size-3.5 fill-current" />
              </button>
            ))}
          </div>
        </div>
        <Button onClick={search} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {list ? "Update" : "Find hotels"}
        </Button>
      </div>

      {loading && !list && (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Comparing hotels across booking sites…
        </p>
      )}

      {list && list.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">
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
                "flex flex-col overflow-hidden rounded-xl border bg-card",
                isChosen && "ring-2 ring-primary",
              )}
            >
              <div className="flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.imageUrl} alt={h.name} className="h-24 w-28 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: h.stars }).map((_, i) => (
                      <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{h.rating}/5</span>
                  </div>
                  <h4 className="truncate font-semibold">{h.name}</h4>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {h.area} · {h.distanceToCenterKm.toFixed(1)} km from centre
                  </p>
                  <div className="mt-1">
                    <span className="font-serif text-lg font-semibold">{formatINR(h.pricePerNight)}</span>
                    <span className="text-xs text-muted-foreground"> /night · best on {h.bestPriceSite}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 px-3">
                {h.amenities.slice(0, 5).map((a) => (
                  <Badge key={a} variant="muted">
                    {a}
                  </Badge>
                ))}
              </div>

              {/* price comparison */}
              <button
                onClick={() => setExpanded(isOpen ? null : h.id)}
                className="mt-2 flex items-center justify-between px-3 py-2 text-sm text-primary hover:bg-muted/40"
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
                        className="flex items-center gap-1 hover:underline"
                      >
                        {p.site} <ExternalLink className="size-3" />
                      </a>
                      <span className={cn("font-medium", i === 0 && "text-primary")}>
                        {formatINR(p.price)}
                        {i === 0 && (
                          <BadgeCheck className="ml-1 inline size-3.5" />
                        )}
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
                    className="flex items-center justify-between border-t px-3 py-2 text-sm text-primary hover:bg-muted/40"
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
                            <span className="truncate">{s.name}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {t.distanceKm.toFixed(1)} km · {formatDuration(t.durationSec)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}

              <div className="mt-auto p-3 pt-1">
                <Button
                  variant={isChosen ? "secondary" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => setHotel(placeId, isChosen ? null : h)}
                >
                  {isChosen ? <Check className="size-4" /> : null}
                  {isChosen ? `Selected · ${formatINR(h.pricePerNight * nights)} for ${nights} nights` : "Select hotel"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
