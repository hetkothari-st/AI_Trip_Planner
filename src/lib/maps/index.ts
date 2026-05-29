import { hasMapbox, mapboxToken } from "@/lib/env";
import { haversineKm } from "@/lib/utils";

export interface LatLng {
  lat: number;
  lng: number;
}
export interface Waypoint extends LatLng {
  name: string;
}

export interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationSec: number;
}

export interface RouteResult {
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationSec: number;
  // GeoJSON LineString coordinates [lng, lat][] for drawing on the map
  geometry: [number, number][];
  source: "mapbox" | "estimate";
}

const AVG_ROAD_KMH = 40; // hill-road average for the estimate fallback

/** Driving route through the stops in their given order. Falls back to a haversine estimate. */
export async function getRoute(stops: Waypoint[]): Promise<RouteResult> {
  if (stops.length < 2) {
    return { legs: [], totalDistanceKm: 0, totalDurationSec: 0, geometry: stops.map((s) => [s.lng, s.lat]), source: "estimate" };
  }
  if (hasMapbox()) {
    try {
      return await mapboxRoute(stops);
    } catch (err) {
      console.error("[maps] mapbox route failed, estimating:", err);
    }
  }
  return estimateRoute(stops);
}

async function mapboxRoute(stops: Waypoint[]): Promise<RouteResult> {
  const coords = stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`,
  );
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", mapboxToken());

  const res = await fetch(url);
  if (!res.ok) throw new Error(`mapbox directions ${res.status}`);
  const data = (await res.json()) as {
    routes?: { distance: number; duration: number; legs: { distance: number; duration: number }[]; geometry: { coordinates: [number, number][] } }[];
  };
  const route = data.routes?.[0];
  if (!route) throw new Error("no route");

  return {
    legs: route.legs.map((leg, i) => ({
      from: stops[i].name,
      to: stops[i + 1].name,
      distanceKm: leg.distance / 1000,
      durationSec: leg.duration,
    })),
    totalDistanceKm: route.distance / 1000,
    totalDurationSec: route.duration,
    geometry: route.geometry.coordinates,
    source: "mapbox",
  };
}

function estimateRoute(stops: Waypoint[]): RouteResult {
  const legs: RouteLeg[] = [];
  let totalKm = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    // 1.3x crow-flies factor to approximate winding roads
    const km = haversineKm(stops[i], stops[i + 1]) * 1.3;
    totalKm += km;
    legs.push({
      from: stops[i].name,
      to: stops[i + 1].name,
      distanceKm: km,
      durationSec: (km / AVG_ROAD_KMH) * 3600,
    });
  }
  return {
    legs,
    totalDistanceKm: totalKm,
    totalDurationSec: (totalKm / AVG_ROAD_KMH) * 3600,
    geometry: stops.map((s) => [s.lng, s.lat]),
    source: "estimate",
  };
}

/**
 * Phase 9 stub — optimal stop ordering (TSP). Implemented as nearest-neighbour now so
 * the interface is stable; will swap to the Mapbox Optimization API in Phase 9.
 */
export function optimizeOrder(
  stops: Waypoint[],
  startName?: string,
  _endName?: string,
): Waypoint[] {
  if (stops.length < 3) return stops;
  const remaining = [...stops];
  const start = startName ? remaining.find((s) => s.name === startName) ?? remaining[0] : remaining[0];
  const ordered: Waypoint[] = [start];
  remaining.splice(remaining.indexOf(start), 1);
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let best = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineKm(last, s);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    ordered.push(remaining[best]);
    remaining.splice(best, 1);
  }
  return ordered;
}
