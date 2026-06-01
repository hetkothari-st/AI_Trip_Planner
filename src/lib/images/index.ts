import { env, hasUnsplash } from "@/lib/env";
import { TTLCache } from "@/lib/cache";

export interface ImageResult {
  url: string;
  attribution?: string;
}

// Cache resolved images 7 days. Keeps us off rate-limited APIs and makes repeats instant.
const imgCache = new TTLCache<ImageResult>(7 * 24 * 60 * 60 * 1000, 1000);
// Galleries (several photos per place) cached separately, same 7-day window.
const galleryCache = new TTLCache<ImageResult[]>(7 * 24 * 60 * 60 * 1000, 500);

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
 * Resolve a small gallery of REAL photos for a place from Wikimedia Commons. One API call
 * searches the File namespace for the place name and returns each match's thumbnail. Falls
 * back to the single lead image (getImage) when Commons has nothing usable, so the modal
 * always shows at least one photo.
 */
export async function getGallery(query: string, limit = 6): Promise<ImageResult[]> {
  const key = `${query}|${limit}`;
  const cached = galleryCache.get(key);
  if (cached) return cached;

  const name = query.split(",")[0].replace(/\(.*?\)/g, "").trim();
  let results: ImageResult[] = [];
  if (name) {
    try {
      const url = new URL("https://commons.wikimedia.org/w/api.php");
      url.search = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: name,
        gsrnamespace: "6", // File:
        gsrlimit: String(limit * 3), // over-fetch; we filter non-photos out
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "1024",
        format: "json",
        origin: "*",
      }).toString();
      const res = await fetch(url, { headers: { "User-Agent": WIKI_UA } });
      if (!res.ok) throw new Error(`commons ${res.status}`);
      const data = (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              imageinfo?: { thumburl?: string; url?: string; extmetadata?: { Artist?: { value?: string } } }[];
            }
          >;
        };
      };
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      const seen = new Set<string>();
      for (const page of pages) {
        const info = page.imageinfo?.[0];
        const src = info?.thumburl ?? info?.url;
        if (!src) continue;
        // Photos only — skip SVGs, PDFs, maps, icons. Guard against malformed URLs.
        let pathname: string;
        try {
          pathname = new URL(src).pathname;
        } catch {
          continue;
        }
        if (!/\.(jpe?g|png)$/i.test(pathname)) continue;
        if (seen.has(src)) continue;
        seen.add(src);
        results.push({ url: src, attribution: stripHtml(info?.extmetadata?.Artist?.value) ?? "Wikimedia Commons" });
        if (results.length >= limit) break;
      }
    } catch (err) {
      console.error(`[images] commons gallery "${name}" failed:`, err);
    }
  }

  if (results.length === 0) results = [await getImage(query)];
  galleryCache.set(key, results);
  return results;
}

function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  const text = s.replace(/<[^>]*>/g, "").trim();
  return text ? `© ${text} · Wikimedia Commons` : undefined;
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
