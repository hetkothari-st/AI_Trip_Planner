import { env } from "@/lib/env";
import type { Source } from "@/lib/ai/schemas";

/** Web search via Tavily (preferred) or Brave. Returns short notes + attributable sources. */
export async function searchWeb(
  query: string,
): Promise<{ notes: string[]; sources: Source[] }> {
  if (env.tavilyKey) return tavily(query);
  if (env.braveKey) return brave(query);
  return { notes: [], sources: [] };
}

async function tavily(query: string): Promise<{ notes: string[]; sources: Source[] }> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: env.tavilyKey,
      query,
      max_results: 6,
      search_depth: "basic",
    }),
  });
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  const data = (await res.json()) as {
    results?: { title: string; url: string; content?: string }[];
  };
  const results = data.results ?? [];
  return {
    notes: results.map((r) => `${r.title}: ${(r.content ?? "").slice(0, 160)}`),
    sources: results.map((r) => ({ kind: "web" as const, title: r.title, url: r.url })),
  };
}

async function brave(query: string): Promise<{ notes: string[]; sources: Source[] }> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6`,
    { headers: { "X-Subscription-Token": env.braveKey, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`brave ${res.status}`);
  const data = (await res.json()) as {
    web?: { results?: { title: string; url: string; description?: string }[] };
  };
  const results = data.web?.results ?? [];
  return {
    notes: results.map((r) => `${r.title}: ${(r.description ?? "").slice(0, 160)}`),
    sources: results.map((r) => ({ kind: "web" as const, title: r.title, url: r.url })),
  };
}
