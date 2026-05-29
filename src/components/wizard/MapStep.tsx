"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock, Route as RouteIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPanel } from "@/components/map/MapPanel";
import { useTrip, selectedList } from "@/lib/store/trip";
import { formatDuration } from "@/lib/utils";
import type { RouteResult } from "@/lib/maps";

export function MapStep() {
  const store = useTrip();
  const { region, route, setRoute, back } = store;
  const places = selectedList(store);
  const [loading, setLoading] = useState(false);

  // Recompute the route in real time whenever the selected stops change.
  const key = places.map((p) => p.id).join("|");
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (places.length < 1) {
      setRoute(null);
      return;
    }
    setLoading(true);
    const stops = places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));
    fetch("/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stops }),
    })
      .then((r) => r.json())
      .then((d: { route: RouteResult }) => setRoute(d.route))
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [key, places, setRoute]);

  const mapStops = places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Your route</h1>
          <p className="mt-1 text-muted-foreground">
            {places.length} stops across {region?.name}. The map and travel times update as
            your selection changes.
          </p>
        </div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="h-[560px] overflow-hidden rounded-xl border shadow-sm">
          <MapPanel stops={mapStops} route={route} />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Itinerary order</h2>
              {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <ol className="mt-3 space-y-3">
              {places.map((p, i) => (
                <li key={p.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="muted">{p.days}d</Badge>
                    </div>
                    {route?.legs[i] && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatDuration(route.legs[i].durationSec)} ·{" "}
                        {Math.round(route.legs[i].distanceKm)} km to {route.legs[i].to}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {route && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <RouteIcon className="size-4 text-primary" />
                <h2 className="font-semibold">Trip totals</h2>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Distance</dt>
                  <dd className="font-semibold">{Math.round(route.totalDistanceKm)} km</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Driving time</dt>
                  <dd className="font-semibold">{formatDuration(route.totalDurationSec)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stops</dt>
                  <dd className="font-semibold">{places.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total days</dt>
                  <dd className="font-semibold">{places.reduce((n, p) => n + p.days, 0)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Route source: {route.source === "mapbox" ? "Mapbox Directions" : "estimated"}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            Coming next: per-city mini-itineraries, hotels &amp; live cost calculator, route
            optimization, and PDF/Excel export.
          </div>
        </aside>
      </div>
    </div>
  );
}
