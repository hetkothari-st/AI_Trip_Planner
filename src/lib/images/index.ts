import { env, hasUnsplash } from "@/lib/env";

export interface ImageResult {
  url: string;
  attribution?: string;
}

/**
 * Resolve a banner image for a place. Uses Unsplash when a key is present, otherwise a
 * deterministic keyless placeholder (Picsum) seeded by the query so images stay stable.
 */
export async function getImage(query: string): Promise<ImageResult> {
  if (hasUnsplash()) {
    try {
      return await unsplash(query);
    } catch (err) {
      console.error("[images] unsplash failed, using placeholder:", err);
    }
  }
  return placeholder(query);
}

/** Resolve many images concurrently. */
export async function getImages(queries: string[]): Promise<ImageResult[]> {
  return Promise.all(queries.map(getImage));
}

async function unsplash(query: string): Promise<ImageResult> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
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
  if (!hit) return placeholder(query);
  return { url: hit.urls.regular, attribution: `Photo by ${hit.user.name} on Unsplash` };
}

function placeholder(query: string): ImageResult {
  const seed = encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"));
  return {
    url: `https://picsum.photos/seed/${seed}/800/450`,
    attribution: "Placeholder image",
  };
}
