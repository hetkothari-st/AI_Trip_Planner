import { env } from "@/lib/env";
import type { Source } from "@/lib/ai/schemas";

/** YouTube Data API v3 search — surfaces travel vlogs as ranking signals + sources. */
export async function searchYouTube(
  query: string,
): Promise<{ notes: string[]; sources: Source[] }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("q", `${query} travel`);
  url.searchParams.set("key", env.youtubeKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`youtube ${res.status}`);
  const data = (await res.json()) as {
    items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[];
  };
  const items = data.items ?? [];
  return {
    notes: items.map((i) => `YouTube: "${i.snippet.title}" by ${i.snippet.channelTitle}`),
    sources: items.map((i) => ({
      kind: "youtube" as const,
      title: i.snippet.title,
      url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
    })),
  };
}
