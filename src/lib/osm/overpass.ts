import { TTLCache } from "@/lib/cache";

export interface OsmPoi {
  id: string; // `osm-${type}-${id}`
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const UA = "VoyagerTripPlanner/1.0 (https://aitrip.up.railway.app)";
const cache = new TTLCache<OsmPoi[]>(24 * 60 * 60 * 1000, 300);

/** [south, west, north, east] box of ~radiusKm around a centre point. */
export function bboxAround(lat: number, lng: number, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

/** Map a raw Overpass JSON payload to named POIs (ways use their `center`). */
export function parseElements(data: { elements?: OverpassElement[] }): OsmPoi[] {
  const out: OsmPoi[] = [];
  for (const el of data.elements ?? []) {
    const name = el.tags?.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    out.push({ id: `osm-${el.type}-${el.id}`, name, lat, lng, tags: el.tags ?? {} });
  }
  return out;
}

/**
 * Run one Overpass query. `selectors` are QL fragments WITHOUT the `(bbox)` suffix,
 * e.g. `node["tourism"="hotel"]`. We append the shared bbox + request `out center tags`.
 * Returns [] on any failure so callers can fall back.
 */
export async function queryPois(
  bbox: [number, number, number, number],
  selectors: string[],
  limit = 40,
): Promise<OsmPoi[]> {
  const box = bbox.join(",");
  const key = `${box}|${selectors.join("|")}|${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const body = `[out:json][timeout:25];(${selectors.map((s) => `${s}(${box});`).join("")});out center tags ${limit};`;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: `data=${encodeURIComponent(body)}`,
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    const pois = parseElements(await res.json());
    cache.set(key, pois);
    return pois;
  } catch (err) {
    console.error(`[osm] overpass query failed:`, err);
    return [];
  }
}
