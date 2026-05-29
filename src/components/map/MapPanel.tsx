"use client";

import { useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import type { LineLayerSpecification } from "maplibre-gl";
import type { RouteResult } from "@/lib/maps";

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Free, key-less vector tiles + style (no account, no card).
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const routeLayer: LineLayerSpecification = {
  id: "route-line",
  type: "line",
  source: "route",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-color": "#0d6e7a", "line-width": 4, "line-opacity": 0.85 },
};

export function MapPanel({ stops, route }: { stops: MapStop[]; route: RouteResult | null }) {
  const bounds = useMemo(() => computeBounds(stops), [stops]);

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
      initialViewState={{ longitude: bounds.center.lng, latitude: bounds.center.lat, zoom: bounds.zoom }}
      mapStyle={MAP_STYLE}
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
