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
  geometry: [number, number][]; // [lng, lat][]
  source: "osrm" | "estimate";
}

// Free, key-less public OSRM server (driving profile).
const OSRM = "https://router.project-osrm.org";
const AVG_ROAD_KMH = 40; // hill-road average for the estimate fallback

function coordString(stops: Waypoint[]): string {
  return stops.map((s) => `${s.lng},${s.lat}`).join(";");
}

/** Driving route through the stops in their given order (OSRM, haversine fallback). */
export async function getRoute(stops: Waypoint[]): Promise<RouteResult> {
  if (stops.length < 2) {
    return { legs: [], totalDistanceKm: 0, totalDurationSec: 0, geometry: stops.map((s) => [s.lng, s.lat]), source: "estimate" };
  }
  try {
    const url = `${OSRM}/route/v1/driving/${coordString(stops)}?overview=full&geometries=geojson&annotations=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`osrm route ${res.status}`);
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
      source: "osrm",
    };
  } catch (err) {
    console.error("[maps] OSRM route failed, estimating:", err);
    return estimateRoute(stops);
  }
}

/**
 * Optimal stop ordering + route via OSRM Trip service (real TSP). Fixes the chosen
 * start first and optional end last. Falls back to nearest-neighbour + estimate.
 */
export async function optimizeRoute(
  stops: Waypoint[],
  startName?: string,
  endName?: string,
): Promise<{ ordered: Waypoint[]; route: RouteResult }> {
  // arrange so start is first and end is last (OSRM source=first / destination=last)
  let arranged = [...stops];
  if (startName) {
    const i = arranged.findIndex((s) => s.name === startName);
    if (i > 0) arranged = [arranged[i], ...arranged.slice(0, i), ...arranged.slice(i + 1)];
  }
  if (endName) {
    const i = arranged.findIndex((s) => s.name === endName);
    if (i >= 0 && i !== arranged.length - 1)
      arranged = [...arranged.slice(0, i), ...arranged.slice(i + 1), arranged[i]];
  }

  if (arranged.length >= 3) {
    try {
      const params = new URLSearchParams({
        overview: "full",
        geometries: "geojson",
        roundtrip: "false",
        source: "first",
      });
      if (endName) params.set("destination", "last");
      const url = `${OSRM}/trip/v1/driving/${coordString(arranged)}?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`osrm trip ${res.status}`);
      const data = (await res.json()) as {
        trips?: { distance: number; duration: number; legs: { distance: number; duration: number }[]; geometry: { coordinates: [number, number][] } }[];
        waypoints?: { waypoint_index: number }[];
      };
      const trip = data.trips?.[0];
      if (!trip || !data.waypoints) throw new Error("no trip");
      // reorder arranged stops by their optimized waypoint_index
      const ordered = arranged
        .map((s, i) => ({ s, idx: data.waypoints![i].waypoint_index }))
        .sort((a, b) => a.idx - b.idx)
        .map((x) => x.s);
      return {
        ordered,
        route: {
          legs: trip.legs.map((leg, i) => ({
            from: ordered[i].name,
            to: ordered[i + 1].name,
            distanceKm: leg.distance / 1000,
            durationSec: leg.duration,
          })),
          totalDistanceKm: trip.distance / 1000,
          totalDurationSec: trip.duration,
          geometry: trip.geometry.coordinates,
          source: "osrm",
        },
      };
    } catch (err) {
      console.error("[maps] OSRM trip failed, using nearest-neighbour:", err);
    }
  }

  const ordered = optimizeOrder(stops, startName, endName);
  return { ordered, route: await getRoute(ordered) };
}

export function estimateRoute(stops: Waypoint[]): RouteResult {
  const legs: RouteLeg[] = [];
  let totalKm = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const km = haversineKm(stops[i], stops[i + 1]) * 1.3; // winding-road factor
    totalKm += km;
    legs.push({ from: stops[i].name, to: stops[i + 1].name, distanceKm: km, durationSec: (km / AVG_ROAD_KMH) * 3600 });
  }
  return {
    legs,
    totalDistanceKm: totalKm,
    totalDurationSec: (totalKm / AVG_ROAD_KMH) * 3600,
    geometry: stops.map((s) => [s.lng, s.lat]),
    source: "estimate",
  };
}

/** Nearest-neighbour fallback ordering (used when OSRM is unavailable). */
export function optimizeOrder(stops: Waypoint[], startName?: string, _endName?: string): Waypoint[] {
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
