"use client";

import { useEffect, useState } from "react";
import { Loader2, Star, Check, Clock, ShieldCheck, MapPin, Plus } from "lucide-react";
import { cn, estTravel } from "@/lib/utils";
import { useTrip, selectedSpotsOf } from "@/lib/store/trip";
import { formatINR } from "@/lib/cost";
import type { Activity } from "@/lib/ai/schemas";

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function ActivitiesPanel({
  placeId,
  city,
  cityLat,
  cityLng,
}: {
  placeId: string;
  city: string;
  cityLat?: number;
  cityLng?: number;
}) {
  const store = useTrip();
  const { destination, activities, toggleActivity } = store;
  const chosen = activities[placeId] ?? [];
  const [list, setList] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Kept spots (with coords) to pair each activity with the nearest one.
  const plan = store.cityPlans[placeId];
  const spots = plan
    ? selectedSpotsOf(store, placeId, plan).filter((s) => s.lat != null && s.lng != null)
    : [];

  // The nearest kept spot to an activity, with the hop distance/time.
  const nearestSpot = (a: Activity) => {
    if (a.lat == null || a.lng == null || spots.length === 0) return null;
    let best: { name: string; km: number } | null = null;
    for (const s of spots) {
      const { distanceKm } = estTravel({ lat: a.lat, lng: a.lng }, { lat: s.lat!, lng: s.lng! });
      if (!best || distanceKm < best.km) best = { name: s.name, km: distanceKm };
    }
    return best;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destination, city, cityLat, cityLng }),
    })
      .then((r) => r.json())
      .then((d) => active && setList(d.activities))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading)
    return (
      <p className="flex items-center gap-2 py-6 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
        <Loader2 className="size-4 animate-spin" /> Finding reputable experiences in {city}…
      </p>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list?.map((a) => {
        const isChosen = chosen.some((x) => x.id === a.id);
        const near = nearestSpot(a);
        return (
          <div
            key={a.id}
            className={cn(
              "flex flex-col border-2 border-primary p-4 transition-all",
              isChosen ? "bg-primary-container neo-shadow-sm" : "bg-surface-container-lowest",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-lg font-bold uppercase leading-tight">{a.name}</h4>
              <span className="shrink-0 bg-primary px-2 py-1 text-sm font-bold text-primary-container">
                {formatINR(a.price)}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm font-medium text-on-surface-variant">{a.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-tertiary" /> {a.provider}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {fmtMin(a.durationMin)}
              </span>
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-current text-primary-fixed-dim" /> {a.rating}
              </span>
            </div>
            {near && (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-tertiary">
                <MapPin className="size-3.5" /> Near {near.name} · {near.km.toFixed(1)} km
              </p>
            )}
            <button
              onClick={() => toggleActivity(placeId, a)}
              className={cn(
                "mt-3 flex items-center justify-center gap-2 border-2 border-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors",
                isChosen
                  ? "bg-primary text-white hover:bg-secondary"
                  : "bg-surface hover:bg-primary hover:text-white",
              )}
            >
              {isChosen ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={3} />}
              {isChosen ? "Added" : "Add to Trip"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
