import { env, hasUnsplash } from "@/lib/env";
import { TTLCache } from "@/lib/cache";

export interface ImageResult {
  url: string;
  attribution?: string;
}

// Cache resolved images 7 days (Unsplash demo tier is 50 req/hr — caching keeps us well under).
const imgCache = new TTLCache<ImageResult>(7 * 24 * 60 * 60 * 1000, 1000);

/**
 * Resolve a banner image for a place. Uses Unsplash when a key is present, otherwise a
 * deterministic keyless placeholder (Picsum) seeded by the query so images stay stable.
 */
export async function getImage(query: string): Promise<ImageResult> {
  const cached = imgCache.get(query);
  if (cached) return cached;
  const candidates = await unsplashCandidates(query);
  const result = candidates[0] ?? placeholder(query);
  imgCache.set(query, result);
  return result;
}

/**
 * Resolve many images at once, guaranteeing DISTINCT photos across the batch. Unsplash
 * often returns the same generic "Himalaya" shot for several vague queries; we fetch a
 * handful of candidates per query and greedily assign the first one not already taken.
 */
export async function getImages(queries: string[]): Promise<ImageResult[]> {
  const candidateLists = await Promise.all(queries.map((q) => resolveCandidates(q)));
  const used = new Set<string>();
  return candidateLists.map((cands, i) => {
    const pick = cands.find((c) => !used.has(c.url)) ?? cands[0] ?? placeholder(queries[i]);
    used.add(pick.url);
    return pick;
  });
}

/** Candidate list for one query, served from cache when possible. */
async function resolveCandidates(query: string): Promise<ImageResult[]> {
  const cached = imgCache.get(query);
  if (cached) return [cached];
  const cands = await unsplashCandidates(query);
  if (cands[0]) imgCache.set(query, cands[0]);
  return cands.length ? cands : [placeholder(query)];
}

/** Fetch up to 8 landscape candidates from Unsplash; [] if no key / no results / error. */
async function unsplashCandidates(query: string): Promise<ImageResult[]> {
  if (!hasUnsplash()) return [placeholder(query)];
  for (const q of queryVariants(query)) {
    try {
      const url = new URL("https://api.unsplash.com/search/photos");
      url.searchParams.set("query", q);
      url.searchParams.set("per_page", "8");
      url.searchParams.set("orientation", "landscape");
      url.searchParams.set("content_filter", "high");
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${env.unsplashKey}` },
      });
      if (!res.ok) throw new Error(`unsplash ${res.status}`);
      const data = (await res.json()) as {
        results?: { urls: { regular: string }; user: { name: string } }[];
      };
      const hits = (data.results ?? []).map((h) => ({
        url: h.urls.regular,
        attribution: `Photo by ${h.user.name} on Unsplash`,
      }));
      if (hits.length) return hits;
    } catch (err) {
      console.error(`[images] unsplash "${q}" failed:`, err);
    }
  }
  return [placeholder(query)];
}

/**
 * Progressively broaden the search so we still get a RELEVANT photo: try the full query,
 * then the first 3 words (usually the place name), then the first word. Drops noise like
 * "landscape"/"India" that biases Unsplash toward generic stock scenery.
 */
function queryVariants(query: string): string[] {
  const clean = query.replace(/\b(landscape|scenery|view|photo|india)\b/gi, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const variants = [clean, words.slice(0, 3).join(" "), words.slice(0, 2).join(" ")];
  return [...new Set(variants.filter((v) => v.length > 1))];
}

function placeholder(query: string): ImageResult {
  const seed = encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"));
  return {
    url: `https://picsum.photos/seed/${seed}/800/450`,
    attribution: "Placeholder image",
  };
}
