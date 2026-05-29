import { env } from "@/lib/env";
import type { Source } from "@/lib/ai/schemas";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  const basic = Buffer.from(`${env.redditId}:${env.redditSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      "User-Agent": "ai-trip-planner/0.1",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`reddit token ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

/** Reddit search — community trip notes as ranking signals + sources. */
export async function searchReddit(
  query: string,
): Promise<{ notes: string[]; sources: Source[] }> {
  const token = await getToken();
  const url = new URL("https://oauth.reddit.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("sort", "relevance");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "ai-trip-planner/0.1" },
  });
  if (!res.ok) throw new Error(`reddit search ${res.status}`);
  const data = (await res.json()) as {
    data?: { children?: { data: { title: string; permalink: string; subreddit: string } }[] };
  };
  const posts = data.data?.children ?? [];
  return {
    notes: posts.map((p) => `Reddit r/${p.data.subreddit}: "${p.data.title}"`),
    sources: posts.map((p) => ({
      kind: "reddit" as const,
      title: p.data.title,
      url: `https://www.reddit.com${p.data.permalink}`,
    })),
  };
}
