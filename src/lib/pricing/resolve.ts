import { TTLCache, memoizeAsync } from "@/lib/cache";
import { scrapePrice } from "./scrape";

export interface PriceResult {
  price: number;
  priceSource: "live" | "est";
  priceCheckedAt: number;
}

const cache = new TTLCache<PriceResult>(24 * 60 * 60 * 1000, 1000);
// Share one inflight promise per key so concurrent callers don't each launch the scraper.
const inflight = new Map<string, Promise<PriceResult>>();

/**
 * Resolve a price: cached → best-effort scrape → labeled estimate. Never throws —
 * both the scrape and the estimate are guarded. `scrape` is injectable for tests;
 * production defaults to the Playwright scraper. Results cached 24h with inflight dedup.
 */
export async function resolvePrice(args: {
  key: string;
  name: string;
  city: string;
  kind: "hotel" | "activity";
  estimate: () => number;
  scrape?: (a: { name: string; city: string; kind: "hotel" | "activity" }) => Promise<number | null>;
}): Promise<PriceResult> {
  return memoizeAsync(cache, inflight, args.key, async () => {
    const scrapeFn = args.scrape ?? scrapePrice;
    let live: number | null = null;
    try {
      live = await scrapeFn({ name: args.name, city: args.city, kind: args.kind });
    } catch {
      live = null;
    }
    if (live != null) {
      return { price: live, priceSource: "live", priceCheckedAt: Date.now() };
    }
    let est = 0;
    try {
      est = args.estimate();
    } catch {
      est = 0;
    }
    return { price: est, priceSource: "est", priceCheckedAt: Date.now() };
  });
}
