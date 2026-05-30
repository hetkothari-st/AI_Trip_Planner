import { TTLCache } from "@/lib/cache";

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Cache geocodes 30 days — place coordinates don't move.
const geoCache = new TTLCache<GeoPoint | null>(30 * 24 * 60 * 60 * 1000, 1000);

// Nominatim asks for a descriptive User-Agent and ≤1 req/sec; our caching keeps us well under.
const NOMINATIM_UA = "VoyagerTripPlanner/1.0 (https://aitrip.up.railway.app)";

/** Resolve a place name (+ optional context) to lat/lng via OpenStreetMap Nominatim. */
export async function geocode(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  const cached = geoCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = (await res.json()) as { lat: string; lon: string }[];
    const hit = data[0];
    const point = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
    geoCache.set(key, point);
    return point;
  } catch (err) {
    console.error(`[geocode] "${query}" failed:`, err);
    geoCache.set(key, null);
    return null;
  }
}
