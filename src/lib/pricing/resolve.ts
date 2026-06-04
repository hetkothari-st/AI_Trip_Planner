import { TTLCache } from "@/lib/cache";
import { scrapePrice } from "./scrape";

export interface PriceResult {
  price: number;
  priceSource: "live" | "est";
  priceCheckedAt: number;
}

const cache = new TTLCache<PriceResult>(24 * 60 * 60 * 1000, 1000);

/**
 * Resolve a price: cached → best-effort scrape → labeled estimate. Never throws.
 * `scrape` is injectable for tests; production defaults to the Playwright scraper.
 */
export async function resolvePrice(args: {
  key: string;
  name: string;
  city: string;
  kind: "hotel" | "activity";
  estimate: () => number;
  scrape?: (a: { name: string; city: string; kind: "hotel" | "activity" }) => Promise<number | null>;
}): Promise<PriceResult> {
  const hit = cache.get(args.key);
  if (hit) return hit;

  const scrapeFn = args.scrape ?? scrapePrice;
  let live: number | null = null;
  try {
    live = await scrapeFn({ name: args.name, city: args.city, kind: args.kind });
  } catch {
    live = null;
  }

  const result: PriceResult =
    live != null
      ? { price: live, priceSource: "live", priceCheckedAt: Date.now() }
      : { price: args.estimate(), priceSource: "est", priceCheckedAt: Date.now() };

  cache.set(args.key, result);
  return result;
}
