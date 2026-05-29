"use client";

import { useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import type { LineLayer } from "react-map-gl";
import { mapboxToken } from "@/lib/env";
import { formatDuration } from "@/lib/utils";
import type { RouteResult } from "@/lib/maps";

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const routeLayer: LineLayer = {
  id: "route-line",
  type: "line",
  source: "route",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": "#0d6e7a", "line-width": 4, "line-opacity": 0.85 },
};

export function MapPanel({ stops, route }: { stops: MapStop[]; route: RouteResult | null }) {
  const token = mapboxToken();

  const bounds = useMemo(() => computeBounds(stops), [stops]);

  if (!token) {
    return <SchematicMap stops={stops} route={route} />;
  }

  const geojson = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates:
        route?.geometry.length && route.geometry.length > 1
          ? route.geometry
          : stops.map((s) => [s.lng, s.lat] as [number, number]),
    },
  };

  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{
        longitude: bounds.center.lng,
        latitude: bounds.center.lat,
        zoom: bounds.zoom,
      }}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
      style={{ width: "100%", height: "100%" }}
    >
      {stops.length > 1 && (
        <Source id="route" type="geojson" data={geojson}>
          <Layer {...routeLayer} />
        </Source>
      )}
      {stops.map((s, i) => (
        <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="bottom">
          <Pin index={i + 1} label={s.name} />
        </Marker>
      ))}
    </Map>
  );
}

function Pin({ index, label }: { index: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="whitespace-nowrap rounded-full bg-card px-2 py-0.5 text-xs font-medium shadow">
        {label}
      </span>
      <span className="-mt-0.5 flex size-7 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow">
        {index}
      </span>
    </div>
  );
}

/** Keyless fallback: a schematic plot of stops connected in order, with travel times. */
function SchematicMap({ stops, route }: { stops: MapStop[]; route: RouteResult | null }) {
  const { project } = useProjection(stops);
  const pts = stops.map((s) => project(s.lat, s.lng));

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_center,_hsl(187_30%_92%),_hsl(40_25%_96%))]">
      <div className="absolute left-3 top-3 rounded-md bg-card/90 px-2 py-1 text-xs text-muted-foreground shadow">
        Schematic view · add a Mapbox token for the live map
      </div>
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {pts.length > 1 && (
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#0d6e7a"
            strokeWidth={0.5}
            strokeDasharray="1.5 1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {pts.map((p, i) => (
        <div
          key={stops[i].id}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <span className="whitespace-nowrap rounded-full bg-card px-2 py-0.5 text-[11px] font-medium shadow">
            {stops[i].name}
          </span>
          <span className="-mt-0.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-primary text-[11px] font-bold text-primary-foreground shadow">
            {i + 1}
          </span>
        </div>
      ))}
      {route && route.legs.length > 0 && (
        <div className="absolute bottom-3 left-3 rounded-md bg-card/90 px-3 py-2 text-xs shadow">
          <p className="font-medium">{Math.round(route.totalDistanceKm)} km total</p>
          <p className="text-muted-foreground">{formatDuration(route.totalDurationSec)} driving</p>
        </div>
      )}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function computeBounds(stops: MapStop[]) {
  if (stops.length === 0) return { center: { lat: 30, lng: 79 }, zoom: 6 };
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  const zoom = span < 0.5 ? 9 : span < 1.5 ? 8 : span < 3 ? 7 : 6;
  return { center, zoom };
}

function useProjection(stops: MapStop[]) {
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const minLat = Math.min(...lats, 0);
  const maxLat = Math.max(...lats, 1);
  const minLng = Math.min(...lngs, 0);
  const maxLng = Math.max(...lngs, 1);
  const pad = 12;
  const project = (lat: number, lng: number) => ({
    x: maxLng === minLng ? 50 : pad + ((lng - minLng) / (maxLng - minLng)) * (100 - 2 * pad),
    // invert lat so north is up
    y: maxLat === minLat ? 50 : pad + ((maxLat - lat) / (maxLat - minLat)) * (100 - 2 * pad),
  });
  return { project };
}
