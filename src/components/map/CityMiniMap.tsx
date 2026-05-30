"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Marker, Source, Layer } from "react-map-gl/maplibre";
import type { LineLayerSpecification } from "maplibre-gl";
import { BedDouble, Mountain, Loader2 } from "lucide-react";
import { optimizeRoute, type RouteResult } from "@/lib/maps";
import { formatDuration } from "@/lib/utils";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const routeLayer: LineLayerSpecification = {
  id: "city-route",
  type: "line",
  source: "city-route",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": "#0d6e7a", "line-width": 4, "line-opacity": 0.8 },
};

type Kind = "hotel" | "spot" | "activity";
interface Point {
  kind: Kind;
  name: string;
  lat: number;
  lng: number;
}

/**
 * A single city's mini-map: the chosen hotel, the kept spots and the chosen activities as
 * distinguishable pins, connected by an OSRM driving route that starts at the hotel and
 * covers everything in the least-travel order. Routing runs in the browser (OSRM is
 * CORS-enabled) so it uses the user's IP, not the datacenter's.
 */
export function CityMiniMap({
  hotel,
  spots,
  activities,
}: {
  hotel?: { name: string; lat: number; lng: number };
  spots: { name: string; lat: number; lng: number }[];
  activities: { name: string; lat: number; lng: number }[];
}) {
  const points: Point[] = useMemo(
    () => [
      ...(hotel ? [{ kind: "hotel" as const, ...hotel }] : []),
      ...spots.map((s) => ({ kind: "spot" as const, ...s })),
      ...activities.map((a) => ({ kind: "activity" as const, ...a })),
    ],
    [hotel, spots, activities],
  );

  const [ordered, setOrdered] = useState<Point[]>(points);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const key = points.map((p) => `${p.name}@${p.lat},${p.lng}`).join("|");
  const lastKey = useRef("");

  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    setOrdered(points);
    if (points.length < 2) {
      setRoute(null);
      return;
    }
    setLoading(true);
    const byName = new Map(points.map((p) => [p.name, p]));
    optimizeRoute(
      points.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng })),
      hotel?.name,
    )
      .then(({ ordered: ord, route: r }) => {
        setOrdered(ord.map((w) => byName.get(w.name)!).filter(Boolean));
        setRoute(r);
      })
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [key, points, hotel?.name]);

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Select a hotel, spots and activities to see them mapped with a route.
      </p>
    );
  }

  const bounds = computeBounds(points);
  const geojson = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates:
        route?.geometry.length && route.geometry.length > 1
          ? route.geometry
          : ordered.map((p) => [p.lng, p.lat] as [number, number]),
    },
  };

  return (
    <div className="space-y-3">
      <div className="relative h-[420px] overflow-hidden rounded-xl border">
        <MapGL
          initialViewState={{ longitude: bounds.center.lng, latitude: bounds.center.lat, zoom: bounds.zoom }}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
        >
          {points.length > 1 && (
            <Source id="city-route" type="geojson" data={geojson}>
              <Layer {...routeLayer} />
            </Source>
          )}
          {ordered.map((p, i) => (
            <Marker key={`${p.kind}-${p.name}`} longitude={p.lng} latitude={p.lat} anchor="bottom">
              <Pin point={p} order={i + 1} />
            </Marker>
          ))}
        </MapGL>
        {loading && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs shadow">
            <Loader2 className="size-3 animate-spin" /> routing
          </div>
        )}
      </div>

      {/* legend + totals */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Legend kind="hotel" label="Hotel" />
          <Legend kind="spot" label="Spot" />
          <Legend kind="activity" label="Activity" />
        </div>
        {route && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{Math.round(route.totalDistanceKm)} km</span>{" "}
            · {formatDuration(route.totalDurationSec)} total
            {route.source === "estimate" && " (estimated)"}
          </p>
        )}
      </div>
    </div>
  );
}

const KIND_COLOR: Record<Kind, string> = {
  hotel: "bg-primary",
  spot: "bg-emerald-600",
  activity: "bg-accent",
};

function Pin({ point, order }: { point: Point; order: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="max-w-[120px] truncate rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium shadow">
        {point.name}
      </span>
      <span
        className={`-mt-0.5 flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow ${KIND_COLOR[point.kind]}`}
      >
        {point.kind === "hotel" ? (
          <BedDouble className="size-3.5" />
        ) : point.kind === "activity" ? (
          <Mountain className="size-3.5" />
        ) : (
          order
        )}
      </span>
    </div>
  );
}

function Legend({ kind, label }: { kind: Kind; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-3 rounded-full ${KIND_COLOR[kind]}`} /> {label}
    </span>
  );
}

function computeBounds(points: { lat: number; lng: number }[]) {
  if (points.length === 0) return { center: { lat: 30, lng: 79 }, zoom: 12 };
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  const zoom = span < 0.03 ? 14 : span < 0.08 ? 13 : span < 0.2 ? 12 : span < 0.5 ? 11 : 10;
  return { center, zoom };
}
