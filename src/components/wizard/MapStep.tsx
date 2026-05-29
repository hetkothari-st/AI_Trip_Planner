"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Clock, Route as RouteIcon, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPanel } from "@/components/map/MapPanel";
import { useTrip, selectedList } from "@/lib/store/trip";
import { formatDuration } from "@/lib/utils";
import type { RouteResult } from "@/lib/maps";

export function MapStep() {
  const store = useTrip();
  const { region, route, setRoute, setOrder, startId, endId, setStart, setEnd, back, next } = store;
  const places = selectedList(store);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Recompute the route in real time whenever the ordered stops change.
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

  async function optimize() {
    if (places.length < 3) return;
    setOptimizing(true);
    try {
      const stops = places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));
      const start = startId ? store.selected[startId]?.name : undefined;
      const end = endId ? store.selected[endId]?.name : undefined;
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stops, optimize: true, startName: start, endName: end }),
      });
      const data: { route: RouteResult; order: string[] } = await res.json();
      // map optimized names back to place ids, preserving the new order
      const byName = new Map(places.map((p) => [p.name, p.id]));
      const newOrder = data.order.map((n) => byName.get(n)).filter(Boolean) as string[];
      lastKey.current = newOrder.join("|"); // we already have the route; skip refetch
      setOrder(newOrder);
      setRoute(data.route);
    } finally {
      setOptimizing(false);
    }
  }

  const mapStops = places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Your route</h1>
          <p className="mt-1 text-muted-foreground">
            {places.length} stops across {region?.name}. Connected by shortest road distance —
            optimize the order below for the least travel time.
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
          {/* optimizer */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Wand2 className="size-4 text-primary" />
              <h2 className="font-semibold">Optimize route</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a start (end optional) — we reorder stops for the least journey time.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">Start</span>
                <select
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={startId ?? ""}
                  onChange={(e) => setStart(e.target.value || null)}
                >
                  <option value="">Any</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">End (optional)</span>
                <select
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={endId ?? ""}
                  onChange={(e) => setEnd(e.target.value || null)}
                >
                  <option value="">Any</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              className="mt-3 w-full"
              onClick={optimize}
              disabled={optimizing || places.length < 3}
            >
              {optimizing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Optimize order
            </Button>
            {places.length < 3 && (
              <p className="mt-2 text-xs text-muted-foreground">Add 3+ stops to optimize.</p>
            )}
          </div>

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
                Route source: {route.source === "osrm" ? "OSRM live roads" : "estimated"}
              </p>
            </div>
          )}

          <Button size="lg" onClick={next}>
            Build final itinerary <ArrowRight className="size-4" />
          </Button>
        </aside>
      </div>
    </div>
  );
}
