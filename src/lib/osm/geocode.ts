import { TTLCache } from "@/lib/cache";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const UA = "VoyagerTripPlanner/1.0 (https://aitrip.up.railway.app)";
const cache = new TTLCache<{ lat: number; lng: number } | null>(7 * 24 * 60 * 60 * 1000, 500);

/** Geocode a city centre via Nominatim (keyless). Cached 7 days. Null on miss/failure. */
export async function geocodeCity(city: string, destination: string): Promise<{ lat: number; lng: number } | null> {
  const key = `${city}, ${destination}`.toLowerCase();
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    const url = new URL(NOMINATIM_URL);
    url.search = new URLSearchParams({ q: `${city}, ${destination}`, format: "json", limit: "1" }).toString();
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = (await res.json()) as { lat: string; lon: string }[];
    const first = data[0];
    const result = first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
    cache.set(key, result);
    return result;
  } catch (err) {
    console.error(`[osm] geocode "${city}" failed:`, err);
    return null;
  }
}
