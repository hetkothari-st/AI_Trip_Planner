import { env, hasUnsplash } from "@/lib/env";
import { TTLCache } from "@/lib/cache";

export interface ImageResult {
  url: string;
  attribution?: string;
}

// Cache resolved images 7 days. Keeps us off rate-limited APIs and makes repeats instant.
const imgCache = new TTLCache<ImageResult>(7 * 24 * 60 * 60 * 1000, 1000);

// Wikimedia asks for a descriptive User-Agent identifying the app + contact.
const WIKI_UA = "VoyagerTripPlanner/1.0 (https://aitrip.up.railway.app)";

/**
 * Resolve a banner image for a place. Order of preference:
 *   1. Wikipedia page image — the ACTUAL photo of that exact place (keyless, no rate limit,
 *      and far more relevant than stock photos for named landmarks).
 *   2. Unsplash — when a key is present and quota remains.
 *   3. Picsum placeholder — deterministic, keyless last resort.
 * `query` should be the place NAME (optionally "Name, Destination" for disambiguation).
 */
export async function getImage(query: string): Promise<ImageResult> {
  const cached = imgCache.get(query);
  if (cached) return cached;
  const result =
    (await wikipediaImage(query)) ?? (await unsplashImage(query)) ?? placeholder(query);
  imgCache.set(query, result);
  return result;
}

/** Resolve many images at once, guaranteeing DISTINCT photos across the batch. */
export async function getImages(queries: string[]): Promise<ImageResult[]> {
  const resolved = await Promise.all(queries.map(getImage));
  // De-dupe: if two places landed on the same URL, push later ones to a placeholder so
  // the gallery never shows one photo repeated.
  const used = new Set<string>();
  return resolved.map((r, i) => {
    if (!used.has(r.url)) {
      used.add(r.url);
      return r;
    }
    const alt = placeholder(queries[i]);
    used.add(alt.url);
    return alt;
  });
}

/**
 * Search Wikipedia and return the lead image of the best-matching article. One API call:
 * `generator=search` finds the article, `prop=pageimages` returns its thumbnail.
 */
async function wikipediaImage(query: string): Promise<ImageResult | null> {
  const name = query.split(",")[0].replace(/\(.*?\)/g, "").trim();
  if (!name) return null;
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: name,
      gsrlimit: "1",
      prop: "pageimages",
      piprop: "thumbnail|original",
      pithumbsize: "800",
      format: "json",
      origin: "*",
    }).toString();
    const res = await fetch(url, { headers: { "User-Agent": WIKI_UA } });
    if (!res.ok) throw new Error(`wikipedia ${res.status}`);
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source: string }; title?: string }> };
    };
    const pages = data.query?.pages;
    const page = pages && Object.values(pages)[0];
    const src = page?.thumbnail?.source;
    if (!src) return null;
    return { url: src, attribution: `Image: Wikipedia — ${page?.title ?? name}` };
  } catch (err) {
    console.error(`[images] wikipedia "${name}" failed:`, err);
    return null;
  }
}

/** Unsplash search — only used as a fallback now (demo keys are 50 req/hr). */
async function unsplashImage(query: string): Promise<ImageResult | null> {
  if (!hasUnsplash()) return null;
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query.replace(/\(.*?\)/g, "").trim());
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${env.unsplashKey}` },
    });
    if (!res.ok) throw new Error(`unsplash ${res.status}`);
    const data = (await res.json()) as {
      results?: { urls: { regular: string }; user: { name: string } }[];
    };
    const hit = data.results?.[0];
    if (!hit) return null;
    return { url: hit.urls.regular, attribution: `Photo by ${hit.user.name} on Unsplash` };
  } catch (err) {
    console.error(`[images] unsplash "${query}" failed:`, err);
    return null;
  }
}

function placeholder(query: string): ImageResult {
  const seed = encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"));
  return {
    url: `https://picsum.photos/seed/${seed}/800/450`,
    attribution: "Placeholder image",
  };
}
