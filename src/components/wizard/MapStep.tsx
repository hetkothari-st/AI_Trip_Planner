"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Route as RouteIcon,
  Loader2,
  Wand2,
  Map as MapIcon,
  X,
  Navigation,
} from "lucide-react";
import { MapPanel } from "@/components/map/MapPanel";
import { CityMiniMap } from "@/components/map/CityMiniMap";
import { useTrip, selectedList, selectedSpotsOf } from "@/lib/store/trip";
import { formatDuration } from "@/lib/utils";
import { getRoute, optimizeRoute } from "@/lib/maps";

export function MapStep() {
  const store = useTrip();
  const { region, route, setRoute, setOrder, startId, endId, setStart, setEnd, back, next } = store;
  const places = selectedList(store);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [openCityId, setOpenCityId] = useState<string | null>(null);

  const openCity = openCityId ? store.selected[openCityId] : null;
  const openPlan = openCityId ? store.cityPlans[openCityId] : undefined;

  // Recompute the route in real time whenever the ordered stops change.
  const key = places.map((p) => p.id).join("|");
  const lastKey = useRef<string>("");
  // Track which stop-sets we've already auto-optimized so we only do it once per set.
  const autoOptimized = useRef<string>("");

  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (places.length < 1) {
      setRoute(null);
      return;
    }
    setLoading(true);
    const stops = places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));
    // Routing runs in the browser (OSRM is CORS-enabled) so it uses the user's IP
    // rather than the server's datacenter IP, which public OSRM blocks.
    getRoute(stops)
      .then(setRoute)
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [key, places, setRoute]);

  // Auto-optimize the order once per stop-set so the trip defaults to the least-travel
  // sequence (user can still re-pick start/end and re-optimize manually).
  useEffect(() => {
    const set = [...places.map((p) => p.id)].sort().join("|");
    if (places.length < 3 || autoOptimized.current === set) return;
    autoOptimized.current = set;
    const stops = places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));
    optimizeRoute(stops, startId ? store.selected[startId]?.name : undefined)
      .then(({ ordered, route: optRoute }) => {
        const byName = new Map(places.map((p) => [p.name, p.id]));
        const newOrder = ordered.map((s) => byName.get(s.name)).filter(Boolean) as string[];
        if (newOrder.length === places.length) {
          lastKey.current = newOrder.join("|");
          setOrder(newOrder);
          setRoute(optRoute);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function optimize() {
    if (places.length < 3) return;
    setOptimizing(true);
    try {
      const stops = places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng }));
      const start = startId ? store.selected[startId]?.name : undefined;
      const end = endId ? store.selected[endId]?.name : undefined;
      const { ordered, route: optRoute } = await optimizeRoute(stops, start, end);
      // map optimized names back to place ids, preserving the new order
      const byName = new Map(places.map((p) => [p.name, p.id]));
      const newOrder = ordered.map((s) => byName.get(s.name)).filter(Boolean) as string[];
      lastKey.current = newOrder.join("|"); // we already have the route; skip refetch
      setOrder(newOrder);
      setRoute(optRoute);
    } finally {
      setOptimizing(false);
    }
  }

  const mapStops = places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
  const totalDays = places.reduce((n, p) => n + p.days, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-6xl font-bold uppercase leading-[0.85] tracking-tighter md:text-7xl">
            Route
            <br />
            Engine
          </h1>
          <div className="mt-4 flex w-fit items-center gap-2 bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-container">
            <span className="animate-pulse text-base leading-none">●</span>
            {loading || optimizing ? "Live Optimizing" : `${places.length} stops · ${region?.name ?? ""}`}
          </div>
        </div>
        <button
          onClick={back}
          className="flex items-center gap-2 self-start border-2 border-primary bg-surface px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Left control panel */}
        <aside className="flex flex-col gap-6">
          {/* Metrics bento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-primary bg-surface-container-lowest p-4 neo-shadow-sm">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                Distance
              </p>
              <p className="text-3xl font-bold">
                {route ? Math.round(route.totalDistanceKm) : "—"}
                <span className="text-base"> km</span>
              </p>
            </div>
            <div className="border-2 border-primary bg-surface-container-lowest p-4 neo-shadow-sm">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                Duration
              </p>
              <p className="text-3xl font-bold">
                {totalDays}
                <span className="text-base"> days</span>
              </p>
              {route && (
                <p className="text-[10px] font-bold uppercase text-tertiary">
                  {formatDuration(route.totalDurationSec)} drive
                </p>
              )}
            </div>
          </div>

          {/* Optimizer */}
          <div className="border-[3px] border-primary bg-surface-bright p-5 neo-shadow">
            <div className="mb-1 flex items-center gap-2">
              <Wand2 className="size-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-widest">Optimize Route</h2>
            </div>
            <p className="mb-3 text-xs font-medium text-on-surface-variant">
              Pick a start (end optional) — stops reorder for the least journey time.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                Start
                <select
                  className="mt-1 w-full border-2 border-primary bg-surface px-2 py-1.5 text-sm font-medium text-on-surface outline-none focus:border-tertiary"
                  value={startId ?? ""}
                  onChange={(e) => setStart(e.target.value || null)}
                >
                  <option value="">Any</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                End (optional)
                <select
                  className="mt-1 w-full border-2 border-primary bg-surface px-2 py-1.5 text-sm font-medium text-on-surface outline-none focus:border-tertiary"
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
            <button
              onClick={optimize}
              disabled={optimizing || places.length < 3}
              className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-primary bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-tertiary disabled:opacity-50"
            >
              {optimizing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Optimize Order
            </button>
            {places.length < 3 && (
              <p className="mt-2 text-[10px] font-bold uppercase text-on-surface-variant">
                Add 3+ stops to optimize.
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="border-[3px] border-primary bg-surface-bright p-5 neo-shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest">Itinerary Order</h2>
              {loading && <Loader2 className="size-4 animate-spin text-on-surface-variant" />}
            </div>
            <ol className="space-y-0">
              {places.map((p, i) => {
                const last = i === places.length - 1;
                const stage = i === 0 ? "Departure" : last ? "Arrival" : "Midpoint";
                return (
                  <li
                    key={p.id}
                    className={
                      "relative pl-8 " +
                      (last
                        ? ""
                        : "pb-6 before:absolute before:bottom-0 before:left-[7px] before:top-3 before:w-0.5 before:bg-primary")
                    }
                  >
                    <span
                      className={
                        "absolute left-0 top-1 size-4 border-2 border-primary " +
                        (i === 0 ? "bg-primary-container" : "bg-surface-container-lowest")
                      }
                    />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {stage}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setOpenCityId(p.id)}
                        className="truncate text-left text-lg font-bold uppercase leading-tight hover:text-tertiary"
                      >
                        {p.name}
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => setOpenCityId(p.id)}
                          className="text-on-surface-variant hover:text-tertiary"
                          aria-label={`Open ${p.name} map`}
                        >
                          <MapIcon className="size-4" />
                        </button>
                        <span className="border border-primary px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          {p.days}d
                        </span>
                      </div>
                    </div>
                    {route?.legs[i] && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                        <Clock className="size-3" />
                        {formatDuration(route.legs[i].durationSec)} ·{" "}
                        {Math.round(route.legs[i].distanceKm)} km to {route.legs[i].to}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* AI advisory */}
          {route && (
            <div className="border-2 border-primary bg-primary p-5 text-white shadow-[6px_6px_0px_0px_#ffcc00]">
              <div className="mb-2 flex items-center gap-2">
                <RouteIcon className="size-4 text-primary-container" />
                <h4 className="text-sm font-bold uppercase tracking-widest">AI Advisory</h4>
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                Route auto-optimized for least travel time — {Math.round(route.totalDistanceKm)} km
                across {places.length} stops. Source:{" "}
                {route.source === "osrm" ? "OSRM live roads" : "estimated distances"}.
              </p>
            </div>
          )}

          <button
            onClick={next}
            className="flex w-full items-center justify-center gap-2 border-2 border-primary bg-primary-container px-8 py-4 text-sm font-bold uppercase tracking-widest text-primary neo-shadow-hover"
          >
            Build Final Itinerary <ArrowRight className="size-4" strokeWidth={3} />
          </button>
        </aside>

        {/* Right map */}
        <div className="relative h-[560px] overflow-hidden border-[3px] border-primary neo-shadow lg:h-auto lg:min-h-[700px]">
          <MapPanel stops={mapStops} route={route} onStopClick={setOpenCityId} />
          {/* Active tracker overlay */}
          {route && (
            <div className="pointer-events-none absolute right-4 top-4 border-2 border-primary bg-primary px-4 py-3 text-white neo-shadow-sm">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                <Navigation className="size-3" /> Active Tracker
              </p>
              <p className="text-2xl font-bold leading-none">
                {Math.round(route.totalDistanceKm)}
                <span className="text-[10px] font-bold uppercase"> km total</span>
              </p>
            </div>
          )}
          {/* Legend */}
          <div className="pointer-events-none absolute bottom-4 right-4 flex gap-2">
            <div className="flex items-center gap-2 border-2 border-primary bg-surface px-3 py-1.5">
              <div className="size-3 border border-primary bg-primary-container" />
              <span className="text-[10px] font-bold uppercase">Route</span>
            </div>
          </div>
        </div>
      </div>

      {/* nested city mini-map: click a city pin or name to drill in */}
      {openCity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 p-4"
          onClick={() => setOpenCityId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-[3px] border-primary bg-surface-bright p-5 neo-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold uppercase leading-none">{openCity.name}</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                  Hotel, spots and activities routed
                </p>
              </div>
              <button
                onClick={() => setOpenCityId(null)}
                className="flex size-9 items-center justify-center border-2 border-primary bg-surface transition-colors hover:bg-secondary hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <CityMiniMap
              hotel={
                openCityId && store.hotels[openCityId]
                  ? {
                      name: store.hotels[openCityId].name,
                      lat: store.hotels[openCityId].lat,
                      lng: store.hotels[openCityId].lng,
                    }
                  : undefined
              }
              spots={
                openPlan
                  ? selectedSpotsOf(store, openCityId!, openPlan)
                      .filter((s) => s.lat != null && s.lng != null)
                      .map((s) => ({ name: s.name, lat: s.lat!, lng: s.lng! }))
                  : []
              }
              activities={(store.activities[openCityId!] ?? [])
                .filter((a) => a.lat != null && a.lng != null)
                .map((a) => ({ name: a.name, lat: a.lat!, lng: a.lng! }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
