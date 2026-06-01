import { NextResponse } from "next/server";
import { TTLCache } from "@/lib/cache";

export const runtime = "nodejs";

interface Suggestion {
  /** Short label used to seed the trip (e.g. "Uttarakhand"). */
  name: string;
  /** Full descriptive label shown in the dropdown. */
  label: string;
}

// Suggestions barely change — cache each prefix for a day.
const cache = new TTLCache<Suggestion[]>(24 * 60 * 60 * 1000, 500);

const NOMINATIM_UA = "VoyagerTripPlanner/1.0 (https://aitrip.up.railway.app)";

/** Live destination autocomplete via OpenStreetMap Nominatim. */
export async function POST(req: Request) {
  let q = "";
  try {
    q = String((await req.json())?.q ?? "").trim();
  } catch {
    /* empty body */
  }
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return NextResponse.json({ suggestions: cached });

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    // Bias toward travel-worthy places: states, regions, cities, towns.
    url.searchParams.set("featureType", "settlement");
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);

    const raw = (await res.json()) as {
      display_name: string;
      name?: string;
      address?: Record<string, string>;
    }[];

    const seen = new Set<string>();
    const suggestions: Suggestion[] = [];
    for (const r of raw) {
      const name = r.name || r.display_name.split(",")[0];
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      suggestions.push({ name, label: r.display_name });
    }
    cache.set(key, suggestions);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error(`[place-suggest] "${q}" failed:`, err);
    return NextResponse.json({ suggestions: [] });
  }
}
