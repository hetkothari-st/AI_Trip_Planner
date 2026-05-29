import { hasReddit, hasWebSearch, hasYouTube } from "@/lib/env";
import { searchWeb } from "./connectors/web";
import { searchYouTube } from "./connectors/youtube";
import { searchReddit } from "./connectors/reddit";
import type { Source } from "@/lib/ai/schemas";

/**
 * The multi-source research aggregator ("search the entire internet, YouTube, Reddit").
 * Each connector is optional and degrades to nothing when its key is missing; the LLM
 * ranking step (lib/ai) consumes the digest to ground its output. X/Twitter has no free
 * API, so it is intentionally represented via web mentions rather than a live connector.
 */
export interface ResearchDigest {
  query: string;
  notes: string[]; // short human-readable signals fed to the LLM
  sources: Source[]; // attributable links surfaced in the UI
  usedConnectors: string[]; // which real connectors actually ran
}

export async function aggregate(query: string): Promise<ResearchDigest> {
  const tasks: Promise<{ notes: string[]; sources: Source[]; connector: string } | null>[] = [];

  if (hasWebSearch()) tasks.push(safe("web", () => searchWeb(query)));
  if (hasYouTube()) tasks.push(safe("youtube", () => searchYouTube(query)));
  if (hasReddit()) tasks.push(safe("reddit", () => searchReddit(query)));

  const results = (await Promise.all(tasks)).filter(Boolean) as {
    notes: string[];
    sources: Source[];
    connector: string;
  }[];

  return {
    query,
    notes: results.flatMap((r) => r.notes),
    sources: results.flatMap((r) => r.sources),
    usedConnectors: results.map((r) => r.connector),
  };
}

/** Wrap a connector so one failure never breaks aggregation. */
async function safe(
  connector: string,
  fn: () => Promise<{ notes: string[]; sources: Source[] }>,
): Promise<{ notes: string[]; sources: Source[]; connector: string } | null> {
  try {
    const r = await fn();
    return { ...r, connector };
  } catch (err) {
    console.error(`[research] connector "${connector}" failed:`, err);
    return null;
  }
}
