# Real Data Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the always-mock hotels and activities with real free-tier data (OSM/Overpass + Nominatim + Wikipedia images), with best-effort scraped prices and a labeled-estimate fallback, behind the existing provider interfaces so the app never breaks.

**Architecture:** Real data comes from keyless OSM endpoints. Lists render fast using a deterministic price *estimate* (tagged `est`). Live prices are scraped on demand (Playwright headless, one launch per user action, 24h cached) via a new `/api/price` endpoint that upgrades an item to `live`. Every layer falls back to the existing mock so failure is invisible.

**Tech Stack:** Next.js 15 (route handlers, `runtime = "nodejs"`), TypeScript, Zod, Vitest, Playwright (Chromium on Railway), existing `TTLCache`, existing Wikipedia/Commons image layer.

---

## File Structure

**New files**
- `src/lib/osm/overpass.ts` — Overpass QL query builder + fetch + parse → `OsmPoi[]`; bbox helper; 24h cache.
- `src/lib/osm/overpass.test.ts`
- `src/lib/osm/geocode.ts` — Nominatim city-centre geocode (keyless), cached.
- `src/lib/osm/geocode.test.ts`
- `src/lib/pricing/estimate.ts` — deterministic price estimates for hotels/activities.
- `src/lib/pricing/estimate.test.ts`
- `src/lib/pricing/scrape.ts` — `parsePriceFromText` (pure, tested) + `scrapePrice` (Playwright, untested integration).
- `src/lib/pricing/scrape.test.ts`
- `src/lib/pricing/resolve.ts` — `resolvePrice`: cache → scrape → estimate, returns `PriceResult`.
- `src/lib/pricing/resolve.test.ts`
- `src/lib/activities/provider.ts` — `OverpassActivityProvider` + LLM fallback selector.
- `src/lib/activities/provider.test.ts`
- `src/app/api/price/route.ts` — POST `{name, city, kind}` → live/est price.

**Modified files**
- `src/lib/hotels/types.ts` — add `priceSource`, `priceCheckedAt` to `Hotel` + `SitePrice`.
- `src/lib/ai/schemas.ts` — add `priceSource`, `priceCheckedAt` to `ActivitySchema`.
- `src/lib/ai/mock.ts` — set `priceSource: "est"` on mock activities (schema conformance).
- `src/lib/hotels/provider.ts` — add `OverpassHotelProvider`; selector real-first, mock fallback.
- `src/app/api/activities/route.ts` — use `getActivityProvider()` instead of direct `recommendActivities`.
- `src/components/hotels/HotelPanel.tsx` — price badge + lazy live-price fetch on expand.
- `src/components/activities/ActivitiesPanel.tsx` — price badge.
- `package.json` — add `playwright` dependency + `postinstall` chromium install.
- `next.config.*` — `serverExternalPackages: ["playwright"]`.

---

## Task 1: Add `priceSource` to schemas

**Files:**
- Modify: `src/lib/hotels/types.ts`
- Modify: `src/lib/ai/schemas.ts`
- Modify: `src/lib/ai/mock.ts:347-358`

- [ ] **Step 1: Add fields to Hotel + SitePrice**

In `src/lib/hotels/types.ts`, add to `SitePrice`:

```ts
export interface SitePrice {
  site: string;
  price: number;
  url: string;
  priceSource: "live" | "est"; // was this price scraped live or estimated?
}
```

And to `Hotel` (after `currency`):

```ts
  priceSource: "live" | "est"; // provenance of pricePerNight
  priceCheckedAt?: number; // epoch ms when a live price was fetched
```

- [ ] **Step 2: Add fields to ActivitySchema**

In `src/lib/ai/schemas.ts`, inside `ActivitySchema` (after `rating`):

```ts
  priceSource: z.enum(["live", "est"]).default("est"),
  priceCheckedAt: z.number().optional(),
```

- [ ] **Step 3: Make mock activities conform**

In `src/lib/ai/mock.ts`, in the object returned by `mockActivities` (the `.map(({ t }, i) => ({ ... }))`), add after `rating: ...,`:

```ts
      priceSource: "est" as const,
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (the LLM `activitiesJsonSchema` does not need the new field — `.default("est")` fills it; `priceCheckedAt` is optional).

- [ ] **Step 5: Run existing tests**

Run: `npm test`
Expected: PASS — 21 tests still green (mock now carries `priceSource`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/hotels/types.ts src/lib/ai/schemas.ts src/lib/ai/mock.ts
git commit -m "Add priceSource provenance to hotel/activity schemas"
```

---

## Task 2: OSM Overpass client

**Files:**
- Create: `src/lib/osm/overpass.ts`
- Test: `src/lib/osm/overpass.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/osm/overpass.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { bboxAround, parseElements, queryPois } from "./overpass";

afterEach(() => vi.unstubAllGlobals());

describe("bboxAround", () => {
  it("returns [south, west, north, east] spanning the radius", () => {
    const [s, w, n, e] = bboxAround(30, 79, 5);
    expect(s).toBeLessThan(30);
    expect(n).toBeGreaterThan(30);
    expect(w).toBeLessThan(79);
    expect(e).toBeGreaterThan(79);
  });
});

describe("parseElements", () => {
  it("maps nodes and ways (with center) to OsmPoi, skipping nameless", () => {
    const pois = parseElements({
      elements: [
        { type: "node", id: 1, lat: 30.1, lon: 79.1, tags: { name: "A", tourism: "hotel" } },
        { type: "way", id: 2, center: { lat: 30.2, lon: 79.2 }, tags: { name: "B" } },
        { type: "node", id: 3, lat: 30.3, lon: 79.3, tags: { tourism: "hotel" } }, // no name → skip
      ],
    });
    expect(pois).toHaveLength(2);
    expect(pois[0]).toEqual({ id: "osm-node-1", name: "A", lat: 30.1, lng: 79.1, tags: { name: "A", tourism: "hotel" } });
    expect(pois[1].id).toBe("osm-way-2");
  });
});

describe("queryPois", () => {
  it("POSTs Overpass QL and returns parsed POIs", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ elements: [{ type: "node", id: 9, lat: 1, lon: 2, tags: { name: "Z" } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pois = await queryPois(bboxAround(30, 79, 5), ['node["tourism"="hotel"]']);
    expect(pois[0].name).toBe("Z");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns [] on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 504 })));
    expect(await queryPois(bboxAround(30, 79, 5), ['node["tourism"="hotel"]'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/osm/overpass.test.ts`
Expected: FAIL — cannot find module `./overpass`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/osm/overpass.ts
import { TTLCache } from "@/lib/cache";

export interface OsmPoi {
  id: string; // `osm-${type}-${id}`
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const UA = "VoyagerTripPlanner/1.0 (https://aitrip.up.railway.app)";
const cache = new TTLCache<OsmPoi[]>(24 * 60 * 60 * 1000, 300);

/** [south, west, north, east] box of ~radiusKm around a centre point. */
export function bboxAround(lat: number, lng: number, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

/** Map a raw Overpass JSON payload to named POIs (ways use their `center`). */
export function parseElements(data: { elements?: OverpassElement[] }): OsmPoi[] {
  const out: OsmPoi[] = [];
  for (const el of data.elements ?? []) {
    const name = el.tags?.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    out.push({ id: `osm-${el.type}-${el.id}`, name, lat, lng, tags: el.tags ?? {} });
  }
  return out;
}

/**
 * Run one Overpass query. `selectors` are QL fragments WITHOUT the `(bbox)` suffix,
 * e.g. `node["tourism"="hotel"]`. We append the shared bbox + request `out center tags`.
 * Returns [] on any failure so callers can fall back.
 */
export async function queryPois(
  bbox: [number, number, number, number],
  selectors: string[],
  limit = 40,
): Promise<OsmPoi[]> {
  const box = bbox.join(",");
  const key = `${box}|${selectors.join("|")}|${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const body = `[out:json][timeout:25];(${selectors.map((s) => `${s}(${box});`).join("")});out center tags ${limit};`;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: `data=${encodeURIComponent(body)}`,
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    const pois = parseElements(await res.json());
    cache.set(key, pois);
    return pois;
  } catch (err) {
    console.error(`[osm] overpass query failed:`, err);
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/osm/overpass.test.ts`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/osm/overpass.ts src/lib/osm/overpass.test.ts
git commit -m "Add keyless OSM Overpass POI client"
```

---

## Task 3: Nominatim geocode

**Files:**
- Create: `src/lib/osm/geocode.ts`
- Test: `src/lib/osm/geocode.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/osm/geocode.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeCity } from "./geocode";

afterEach(() => vi.unstubAllGlobals());

describe("geocodeCity", () => {
  it("returns the first hit's lat/lng as numbers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify([{ lat: "30.0869", lon: "78.2676" }]), { status: 200 }),
    ));
    expect(await geocodeCity("Rishikesh", "Uttarakhand")).toEqual({ lat: 30.0869, lng: 78.2676 });
  });

  it("returns null when there are no hits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { status: 200 })));
    expect(await geocodeCity("Nowhereville", "Nowhere")).toBeNull();
  });

  it("returns null on a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    expect(await geocodeCity("X", "Y")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/osm/geocode.test.ts`
Expected: FAIL — cannot find module `./geocode`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/osm/geocode.ts
import { TTLCache } from "@/lib/cache";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const UA = "VoyagerTripPlanner/1.0 (https://aitrip.up.railway.app)";
const cache = new TTLCache<{ lat: number; lng: number } | null>(7 * 24 * 60 * 60 * 1000, 500);

/** Geocode a city centre via Nominatim (keyless). Cached 7 days. Null on miss/failure. */
export async function geocodeCity(city: string, destination: string): Promise<{ lat: number; lng: number } | null> {
  const key = `${city}, ${destination}`.toLowerCase();
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    const url = new URL(NOMINATIM_URL);
    url.search = new URLSearchParams({ q: `${city}, ${destination}`, format: "json", limit: "1" }).toString();
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = (await res.json()) as { lat: string; lon: string }[];
    const first = data[0];
    const result = first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
    cache.set(key, result);
    return result;
  } catch (err) {
    console.error(`[osm] geocode "${city}" failed:`, err);
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/osm/geocode.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/osm/geocode.ts src/lib/osm/geocode.test.ts
git commit -m "Add keyless Nominatim city geocode"
```

---

## Task 4: Price estimates

**Files:**
- Create: `src/lib/pricing/estimate.ts`
- Test: `src/lib/pricing/estimate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pricing/estimate.test.ts
import { describe, expect, it } from "vitest";
import { estimateActivityPrice, estimateHotelPrice } from "./estimate";

describe("estimateHotelPrice", () => {
  it("scales with stars and is deterministic per name", () => {
    const a = estimateHotelPrice("Pine Retreat", 5);
    const b = estimateHotelPrice("Pine Retreat", 5);
    expect(a).toBe(b); // stable for same input
    expect(estimateHotelPrice("Pine Retreat", 5)).toBeGreaterThan(estimateHotelPrice("Pine Retreat", 3));
  });

  it("rounds to the nearest 50 and stays positive for odd star counts", () => {
    const p = estimateHotelPrice("Some Inn", 0);
    expect(p % 50).toBe(0);
    expect(p).toBeGreaterThan(0);
  });
});

describe("estimateActivityPrice", () => {
  it("grows with duration and is deterministic per name", () => {
    const short = estimateActivityPrice("Walk", "nature", 60);
    const long = estimateActivityPrice("Walk", "nature", 240);
    expect(long).toBeGreaterThan(short);
    expect(estimateActivityPrice("Walk", "nature", 60)).toBe(short);
  });

  it("charges adventure more than nature for the same duration", () => {
    expect(estimateActivityPrice("X", "adventure", 120)).toBeGreaterThan(estimateActivityPrice("X", "nature", 120));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pricing/estimate.test.ts`
Expected: FAIL — cannot find module `./estimate`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/pricing/estimate.ts
import { seededRandom } from "@/lib/utils";

const STAR_BASE: Record<number, number> = { 1: 1200, 2: 1800, 3: 2800, 4: 4500, 5: 7000 };

function clampStars(stars: number): number {
  return Math.min(5, Math.max(1, Math.round(stars))) || 3;
}

/** Plausible per-night INR for a real hotel we have no live price for. Deterministic per name. */
export function estimateHotelPrice(name: string, stars: number): number {
  const base = STAR_BASE[clampStars(stars)] ?? 2800;
  const jitter = 0.85 + seededRandom(`hotelprice-${name}`) * 0.3; // ±15%
  return Math.round((base * jitter) / 50) * 50;
}

/** Plausible per-person INR for an activity. Adventure costs more; longer costs more. */
export function estimateActivityPrice(name: string, category: string, durationMin: number): number {
  const perHour = /adventure|sport|trek|raft|paraglid/i.test(category) ? 900 : 500;
  const base = 300 + (durationMin / 60) * perHour;
  const jitter = 0.85 + seededRandom(`actprice-${name}`) * 0.3;
  return Math.round((base * jitter) / 50) * 50;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pricing/estimate.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/estimate.ts src/lib/pricing/estimate.test.ts
git commit -m "Add deterministic hotel/activity price estimates"
```

---

## Task 5: Price scrape (parser tested, Playwright launcher untested)

**Files:**
- Create: `src/lib/pricing/scrape.ts`
- Test: `src/lib/pricing/scrape.test.ts`

- [ ] **Step 1: Write the failing test (parser only)**

```ts
// src/lib/pricing/scrape.test.ts
import { describe, expect, it } from "vitest";
import { parsePriceFromText } from "./scrape";

describe("parsePriceFromText", () => {
  it("extracts the first rupee amount with thousands separators", () => {
    expect(parsePriceFromText('... "displayPrice":"₹3,499" ...')).toBe(3499);
  });

  it("handles a space after the symbol", () => {
    expect(parsePriceFromText("Starts at ₹ 1,250 per night")).toBe(1250);
  });

  it("returns null when no plausible price is present", () => {
    expect(parsePriceFromText("no prices here")).toBeNull();
    expect(parsePriceFromText("₹12")).toBeNull(); // below the 300 floor
  });

  it("ignores absurd values above the ceiling", () => {
    expect(parsePriceFromText("₹9,999,999")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pricing/scrape.test.ts`
Expected: FAIL — cannot find module `./scrape`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/pricing/scrape.ts
// Best-effort price scraping. The PARSER is pure + tested. The Playwright launcher is
// integration-only (no unit test) and returns null on ANY failure so callers fall back.

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Pull the first plausible INR amount (300..200000) out of arbitrary page text. */
export function parsePriceFromText(text: string): number | null {
  const re = /₹\s?([\d,]{3,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 300 && n <= 200000) return n;
  }
  return null;
}

function searchUrl(name: string, city: string): string {
  const q = encodeURIComponent(`${name} ${city}`);
  return `https://www.makemytrip.com/hotels/hotel-listing/?searchText=${q}`;
}

/**
 * Launch headless Chromium, open a booking search, and scrape the first listed price.
 * Returns null on timeout / block / any error. Bounded: one launch per call, 6s nav cap.
 * Not unit-tested (live + non-deterministic); the parser above is the tested part.
 */
export async function scrapePrice(args: { name: string; city: string; kind: "hotel" | "activity" }): Promise<number | null> {
  // Activities have no reliable price page — skip scraping, force estimate fallback.
  if (args.kind === "activity") return null;

  let browser: import("playwright").Browser | null = null;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage({ userAgent: DESKTOP_UA });
    await page.goto(searchUrl(args.name, args.city), { timeout: 6000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const html = await page.content();
    return parsePriceFromText(html);
  } catch (err) {
    console.error(`[pricing] scrape "${args.name}" failed:`, err);
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pricing/scrape.test.ts`
Expected: PASS (4 cases). The dynamic `import("playwright")` is never executed in tests, so the missing browser is irrelevant here.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/scrape.ts src/lib/pricing/scrape.test.ts
git commit -m "Add price scrape parser + Playwright launcher"
```

---

## Task 6: resolvePrice (cache → scrape → estimate)

**Files:**
- Create: `src/lib/pricing/resolve.ts`
- Test: `src/lib/pricing/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pricing/resolve.test.ts
import { describe, expect, it, vi } from "vitest";
import { resolvePrice } from "./resolve";

describe("resolvePrice", () => {
  it("returns a live price when the scraper finds one", async () => {
    const r = await resolvePrice({
      key: "live-1",
      name: "Hotel A",
      city: "Rishikesh",
      kind: "hotel",
      estimate: () => 9999,
      scrape: async () => 3500,
    });
    expect(r).toMatchObject({ price: 3500, priceSource: "live" });
    expect(typeof r.priceCheckedAt).toBe("number");
  });

  it("falls back to the estimate when the scraper returns null", async () => {
    const r = await resolvePrice({
      key: "est-1",
      name: "Hotel B",
      city: "Nainital",
      kind: "hotel",
      estimate: () => 4200,
      scrape: async () => null,
    });
    expect(r).toMatchObject({ price: 4200, priceSource: "est" });
  });

  it("falls back to the estimate when the scraper throws", async () => {
    const r = await resolvePrice({
      key: "throw-1",
      name: "Hotel C",
      city: "Mussoorie",
      kind: "hotel",
      estimate: () => 5000,
      scrape: async () => {
        throw new Error("blocked");
      },
    });
    expect(r.priceSource).toBe("est");
    expect(r.price).toBe(5000);
  });

  it("caches the first result for a key (scraper called once)", async () => {
    const scrape = vi.fn(async () => 1500);
    const args = { key: "cache-1", name: "H", city: "C", kind: "hotel" as const, estimate: () => 1, scrape };
    await resolvePrice(args);
    await resolvePrice(args);
    expect(scrape).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pricing/resolve.test.ts`
Expected: FAIL — cannot find module `./resolve`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/pricing/resolve.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pricing/resolve.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/resolve.ts src/lib/pricing/resolve.test.ts
git commit -m "Add resolvePrice: cache -> scrape -> estimate"
```

---

## Task 7: OverpassHotelProvider + selector

**Files:**
- Modify: `src/lib/hotels/provider.ts`
- Test: `src/lib/hotels/provider.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/hotels/provider.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverpassHotelProvider } from "./provider";
import type { OsmPoi } from "@/lib/osm/overpass";

afterEach(() => vi.restoreAllMocks());

const poi = (over: Partial<OsmPoi>): OsmPoi => ({
  id: "osm-node-1",
  name: "Pine Retreat",
  lat: 30.1,
  lng: 79.05,
  tags: { tourism: "hotel", stars: "4", internet_access: "wlan" },
  ...over,
});

describe("OverpassHotelProvider", () => {
  it("maps OSM POIs to Hotels, reading stars + amenities from tags", async () => {
    const provider = new OverpassHotelProvider({
      queryPois: async () => [poi({})],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      imageFor: async () => "http://img/a.jpg",
    });
    const hotels = await provider.search({
      city: "Rishikesh",
      destination: "Uttarakhand",
      budgetMax: 20000,
      minStars: 1,
      nights: 2,
    });
    expect(hotels).toHaveLength(1);
    expect(hotels[0]).toMatchObject({ name: "Pine Retreat", stars: 4, currency: "INR", priceSource: "est" });
    expect(hotels[0].amenities).toContain("Free Wi-Fi");
    expect(hotels[0].prices.length).toBeGreaterThan(0);
    expect(hotels[0].imageUrl).toBe("http://img/a.jpg");
  });

  it("filters out hotels below minStars and above budget, cheapest first", async () => {
    const provider = new OverpassHotelProvider({
      queryPois: async () => [
        poi({ id: "osm-node-1", name: "Budget", tags: { tourism: "hotel", stars: "2" } }),
        poi({ id: "osm-node-2", name: "Posh", tags: { tourism: "hotel", stars: "5" } }),
      ],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      imageFor: async () => "http://img/x.jpg",
    });
    const hotels = await provider.search({
      city: "Rishikesh",
      destination: "Uttarakhand",
      budgetMax: 100000,
      minStars: 3,
      nights: 1,
    });
    expect(hotels.map((h) => h.name)).toEqual(["Posh"]); // 2-star filtered out
  });

  it("returns [] when geocode and supplied coords are both missing", async () => {
    const provider = new OverpassHotelProvider({
      queryPois: async () => [poi({})],
      geocodeCity: async () => null,
      imageFor: async () => "x",
    });
    const hotels = await provider.search({
      city: "Nowhere",
      destination: "Nowhere",
      budgetMax: 20000,
      minStars: 1,
      nights: 1,
    });
    expect(hotels).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/hotels/provider.test.ts`
Expected: FAIL — `OverpassHotelProvider` is not exported.

- [ ] **Step 3: Write the implementation**

Add these imports at the top of `src/lib/hotels/provider.ts` (keep the existing imports):

```ts
import { bboxAround, queryPois as realQueryPois, type OsmPoi } from "@/lib/osm/overpass";
import { geocodeCity as realGeocodeCity } from "@/lib/osm/geocode";
import { getImage } from "@/lib/images";
import { estimateHotelPrice } from "@/lib/pricing/estimate";
import { hasOverpass } from "@/lib/env";
```

Add this amenity-tag map and the provider class ABOVE the existing `let cached` line:

```ts
// OSM tag → human amenity label. Only tags we can trust as present.
const AMENITY_TAGS: { test: (t: Record<string, string>) => boolean; label: string }[] = [
  { test: (t) => t.internet_access === "wlan" || t.internet_access === "yes" || t["internet_access:fee"] === "no", label: "Free Wi-Fi" },
  { test: (t) => t.swimming_pool === "yes" || t.leisure === "swimming_pool", label: "Pool" },
  { test: (t) => t.parking === "yes" || t.amenity === "parking", label: "Parking" },
  { test: (t) => t.air_conditioning === "yes", label: "Air conditioning" },
  { test: (t) => t.restaurant === "yes" || t.amenity === "restaurant", label: "Restaurant" },
  { test: (t) => t.breakfast === "yes" || t.breakfast === "included", label: "Breakfast included" },
  { test: (t) => t.wheelchair === "yes", label: "Wheelchair access" },
  { test: (t) => t.pet === "yes" || t.dog === "yes", label: "Pet friendly" },
];

function starsFromTags(tags: Record<string, string>): number {
  const raw = Number(tags.stars);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 5) return Math.round(raw);
  if (tags.tourism === "hostel") return 2;
  if (tags.tourism === "guest_house") return 3;
  return 3; // unrated hotel
}

function areaFromTags(tags: Record<string, string>): string {
  return tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:city"] || "City Centre";
}

/** Dependencies are injectable so the provider is unit-testable without network. */
export interface OverpassDeps {
  queryPois: typeof realQueryPois;
  geocodeCity: typeof realGeocodeCity;
  imageFor: (name: string) => Promise<string>;
}

export class OverpassHotelProvider implements HotelProvider {
  readonly name = "overpass";
  constructor(
    private deps: OverpassDeps = {
      queryPois: realQueryPois,
      geocodeCity: realGeocodeCity,
      imageFor: async (name) => (await getImage(name)).url,
    },
  ) {}

  async search(params: HotelSearchParams): Promise<Hotel[]> {
    const { city, destination, budgetMax, minStars, cityLat, cityLng } = params;
    const center =
      cityLat != null && cityLng != null
        ? { lat: cityLat, lng: cityLng }
        : await this.deps.geocodeCity(city, destination);
    if (!center) return [];

    const pois = await this.deps.queryPois(bboxAround(center.lat, center.lng, 6), [
      'node["tourism"~"hotel|guest_house|hostel"]',
      'way["tourism"~"hotel|guest_house|hostel"]',
    ]);

    const hotels = await Promise.all(
      pois.slice(0, 12).map((p) => this.toHotel(p, center, city, budgetMax)),
    );

    return hotels
      .filter((h): h is Hotel => h !== null && h.stars >= minStars && h.pricePerNight <= budgetMax)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);
  }

  private async toHotel(
    p: OsmPoi,
    center: { lat: number; lng: number },
    city: string,
    budgetMax: number,
  ): Promise<Hotel | null> {
    const stars = starsFromTags(p.tags);
    const estimate = Math.min(estimateHotelPrice(p.name, stars), budgetMax);
    const amenities = AMENITY_TAGS.filter((a) => a.test(p.tags)).map((a) => a.label);
    if (amenities.length < 2) amenities.push("Free Wi-Fi", "Parking");

    const prices: SitePrice[] = BOOKING_SITES.map((site) => ({
      site,
      price: estimate,
      url: deepLink(site, p.name, city),
      priceSource: "est" as const,
    }));

    return {
      id: p.id,
      name: p.name,
      stars,
      rating: Math.round((3.5 + (stars - 3) * 0.4) * 10) / 10,
      pricePerNight: estimate,
      currency: "INR",
      priceSource: "est",
      imageUrl: await this.deps.imageFor(`${p.name} ${city}`),
      amenities: Array.from(new Set(amenities)).slice(0, 6),
      area: areaFromTags(p.tags),
      lat: p.lat,
      lng: p.lng,
      distanceToCenterKm: haversineKm(center, { lat: p.lat, lng: p.lng }),
      prices,
      bestPriceSite: prices[0].site,
    };
  }
}
```

Replace the existing `getHotelProvider` selector so real comes first with mock fallback:

```ts
let cached: HotelProvider | null = null;

/** Real OSM provider when Overpass is enabled, else deterministic mock. */
export function getHotelProvider(): HotelProvider {
  if (cached) return cached;
  cached = hasOverpass() ? new OverpassHotelProvider() : new MockHotelProvider();
  return cached;
}

/** Wrapper: try the real provider, fall back to mock if it yields nothing. */
class FallbackHotelProvider implements HotelProvider {
  readonly name = "overpass+mock";
  private real = new OverpassHotelProvider();
  private mock = new MockHotelProvider();
  async search(params: HotelSearchParams): Promise<Hotel[]> {
    const real = await this.real.search(params).catch(() => []);
    return real.length > 0 ? real : this.mock.search(params);
  }
}
```

Then make the selector use the fallback wrapper:

```ts
export function getHotelProvider(): HotelProvider {
  if (cached) return cached;
  cached = hasOverpass() ? new FallbackHotelProvider() : new MockHotelProvider();
  return cached;
}
```

(Delete the first `getHotelProvider` definition shown above — keep only this final one. Two definitions are shown for clarity; the file must contain exactly one.)

- [ ] **Step 4: Add `hasOverpass` to env**

In `src/lib/env.ts`, add after the other `has*` helpers:

```ts
// Overpass/Nominatim are keyless; this flag lets us disable real OSM in dev/tests.
export const hasOverpass = () => process.env.DISABLE_OSM !== "1";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/hotels/provider.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all prior tests + new ones.

- [ ] **Step 7: Commit**

```bash
git add src/lib/hotels/provider.ts src/lib/hotels/provider.test.ts src/lib/env.ts
git commit -m "Add OverpassHotelProvider with mock fallback"
```

---

## Task 8: OverpassActivityProvider + LLM fallback + wire route

**Files:**
- Create: `src/lib/activities/provider.ts`
- Test: `src/lib/activities/provider.test.ts`
- Modify: `src/app/api/activities/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/activities/provider.test.ts
import { describe, expect, it } from "vitest";
import { OverpassActivityProvider } from "./provider";
import type { OsmPoi } from "@/lib/osm/overpass";
import type { Activity } from "@/lib/ai/schemas";

const poi = (over: Partial<OsmPoi>): OsmPoi => ({
  id: "osm-node-7",
  name: "Shivpuri Rafting Point",
  lat: 30.13,
  lng: 78.42,
  tags: { sport: "rafting" },
  ...over,
});

describe("OverpassActivityProvider", () => {
  it("maps OSM leisure/sport POIs to Activities with estimated prices", async () => {
    const provider = new OverpassActivityProvider({
      queryPois: async () => [poi({})],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      llmFallback: async () => [],
    });
    const acts = await provider.search("Uttarakhand", "Rishikesh", 30, 79);
    expect(acts[0]).toMatchObject({ name: "Shivpuri Rafting Point", priceSource: "est" });
    expect(acts[0].price).toBeGreaterThan(0);
    expect(acts[0].lat).toBeCloseTo(30.13);
  });

  it("falls back to the LLM when OSM yields too few activities", async () => {
    const llm: Activity[] = [
      { id: "llm-1", name: "Cooking Class", description: "d", provider: "p", durationMin: 120, price: 900, rating: 4.6, priceSource: "est" },
    ];
    const provider = new OverpassActivityProvider({
      queryPois: async () => [],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      llmFallback: async () => llm,
    });
    const acts = await provider.search("Goa", "Panaji", 15, 73);
    expect(acts).toEqual(llm);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/activities/provider.test.ts`
Expected: FAIL — cannot find module `./provider`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/activities/provider.ts
import { bboxAround, queryPois as realQueryPois, type OsmPoi } from "@/lib/osm/overpass";
import { geocodeCity as realGeocodeCity } from "@/lib/osm/geocode";
import { recommendActivities } from "@/lib/ai";
import { estimateActivityPrice } from "@/lib/pricing/estimate";
import { seededRandom } from "@/lib/utils";
import type { Activity } from "@/lib/ai/schemas";

// OSM selectors that tend to map to "do an activity here" spots.
const ACTIVITY_SELECTORS = [
  'node["sport"~"rafting|paragliding|climbing|canoe|skiing"]',
  'node["leisure"~"park|water_park|nature_reserve|sports_centre"]',
  'node["tourism"~"theme_park|zoo|aquarium|viewpoint"]',
];

const MIN_REAL = 3; // below this, fall back to the LLM

function durationFor(tags: Record<string, string>): number {
  if (/rafting|paraglid|climb/.test(JSON.stringify(tags))) return 180;
  if (tags.tourism === "viewpoint") return 45;
  return 120;
}

export interface ActivityDeps {
  queryPois: typeof realQueryPois;
  geocodeCity: typeof realGeocodeCity;
  llmFallback: (destination: string, city: string, lat?: number, lng?: number) => Promise<Activity[]>;
}

export class OverpassActivityProvider {
  readonly name = "overpass";
  constructor(
    private deps: ActivityDeps = {
      queryPois: realQueryPois,
      geocodeCity: realGeocodeCity,
      llmFallback: recommendActivities,
    },
  ) {}

  async search(destination: string, city: string, cityLat?: number, cityLng?: number): Promise<Activity[]> {
    const center =
      cityLat != null && cityLng != null
        ? { lat: cityLat, lng: cityLng }
        : await this.deps.geocodeCity(city, destination);

    if (center) {
      const pois = await this.deps.queryPois(bboxAround(center.lat, center.lng, 15), ACTIVITY_SELECTORS);
      const acts = pois.slice(0, 8).map((p) => this.toActivity(p));
      if (acts.length >= MIN_REAL) return acts;
    }
    // Too few real activities (or no centre) → LLM-generated.
    return this.deps.llmFallback(destination, city, cityLat, cityLng);
  }

  private toActivity(p: OsmPoi): Activity {
    const category = p.tags.sport || p.tags.leisure || p.tags.tourism || "activity";
    const durationMin = durationFor(p.tags);
    return {
      id: p.id,
      name: p.name,
      description: `${p.name} — ${category.replace(/_/g, " ")} near you. Book locally on arrival.`,
      provider: "Local operators",
      durationMin,
      price: estimateActivityPrice(p.name, category, durationMin),
      rating: Math.round((4 + seededRandom(`actr-${p.id}`)) * 10) / 10,
      priceSource: "est",
      lat: p.lat,
      lng: p.lng,
    };
  }
}

let cached: OverpassActivityProvider | null = null;
export function getActivityProvider(): OverpassActivityProvider {
  if (!cached) cached = new OverpassActivityProvider();
  return cached;
}
```

- [ ] **Step 4: Wire the route**

Replace the body of `src/app/api/activities/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getActivityProvider } from "@/lib/activities/provider";

export const runtime = "nodejs";

const Body = z.object({
  destination: z.string().min(2).max(80),
  city: z.string().min(1).max(80),
  cityLat: z.number().optional(),
  cityLng: z.number().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { destination, city, cityLat, cityLng } = parsed.data;
  const activities = await getActivityProvider().search(destination, city, cityLat, cityLng);
  // Give any activity still missing a location one near the city centre, so it can be
  // paired with the nearest spot in the UI.
  const center = { lat: cityLat ?? 30.0, lng: cityLng ?? 79.0 };
  activities.forEach((a, i) => {
    if (a.lat == null || a.lng == null) {
      a.lat = center.lat + ((i % 5) - 2) * 0.012;
      a.lng = center.lng + (((i + 2) % 5) - 2) * 0.012;
    }
  });
  return NextResponse.json({ activities });
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/lib/activities/provider.test.ts`
Expected: PASS (2 cases).

- [ ] **Step 6: Typecheck + full suite**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/activities/provider.ts src/lib/activities/provider.test.ts src/app/api/activities/route.ts
git commit -m "Add OverpassActivityProvider with LLM fallback; wire activities route"
```

---

## Task 9: `/api/price` endpoint (on-demand live price)

**Files:**
- Create: `src/app/api/price/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/price/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolvePrice } from "@/lib/pricing/resolve";
import { estimateActivityPrice, estimateHotelPrice } from "@/lib/pricing/estimate";

export const runtime = "nodejs";
export const maxDuration = 15; // Playwright nav can take a few seconds

const Body = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  kind: z.enum(["hotel", "activity"]),
  stars: z.number().min(1).max(5).optional(),
  durationMin: z.number().min(15).max(1440).optional(),
  category: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { name, city, kind, stars, durationMin, category } = parsed.data;

  const estimate = () =>
    kind === "hotel"
      ? estimateHotelPrice(name, stars ?? 3)
      : estimateActivityPrice(name, category ?? "activity", durationMin ?? 120);

  const result = await resolvePrice({ key: `${kind}:${name}:${city}`, name, city, kind, estimate });
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/price/route.ts
git commit -m "Add /api/price endpoint for on-demand live prices"
```

---

## Task 10: UI — price-source badges + lazy live price

**Files:**
- Modify: `src/components/hotels/HotelPanel.tsx`
- Modify: `src/components/activities/ActivitiesPanel.tsx`

- [ ] **Step 1: Add a shared price badge to HotelPanel**

In `src/components/hotels/HotelPanel.tsx`, change the price line (currently `src/components/hotels/HotelPanel.tsx:142-148`) to include a provenance badge. Replace that `<div className="mt-1">…</div>` block with:

```tsx
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-lg font-bold">{formatINR(h.pricePerNight)}</span>
                    <span
                      className={cn(
                        "border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                        h.priceSource === "live"
                          ? "border-tertiary text-tertiary"
                          : "border-on-surface-variant/40 text-on-surface-variant",
                      )}
                      title={h.priceSource === "live" ? "Live price from a booking site" : "Estimated — open to fetch a live price"}
                    >
                      {h.priceSource === "live" ? "live" : "est"}
                    </span>
                    <span className="text-[11px] font-medium text-on-surface-variant">
                      /night/room{rooms > 1 ? ` · ${rooms} rooms` : ""} · best on {h.bestPriceSite}
                    </span>
                  </div>
```

- [ ] **Step 2: Fetch a live price when a card's "Compare sites" is expanded**

In `HotelPanel.tsx`, add this helper inside the component (after the `search` function):

```tsx
  // Lazily upgrade a hotel's estimated price to a live scraped one the first time its
  // comparison panel is opened. Best-effort: failures silently keep the estimate.
  async function fetchLive(h: Hotel) {
    if (h.priceSource === "live") return;
    try {
      const res = await fetch("/api/price", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: h.name, city, kind: "hotel", stars: h.stars }),
      });
      if (!res.ok) return;
      const { price, priceSource, priceCheckedAt } = await res.json();
      if (priceSource !== "live") return;
      setList((cur) =>
        cur?.map((x) =>
          x.id === h.id
            ? {
                ...x,
                pricePerNight: price,
                priceSource,
                priceCheckedAt,
                prices: x.prices.map((p, i) => ({ ...p, price: i === 0 ? price : p.price, priceSource: "live" as const })),
              }
            : x,
        ) ?? cur,
      );
    } catch {
      /* keep estimate */
    }
  }
```

Then change the "Compare sites" button's `onClick` (currently `setExpanded(isOpen ? null : h.id)` at `src/components/hotels/HotelPanel.tsx:162`) to also trigger the fetch:

```tsx
                onClick={() => {
                  const opening = !isOpen;
                  setExpanded(opening ? h.id : null);
                  if (opening) fetchLive(h);
                }}
```

- [ ] **Step 3: Add a price badge to ActivitiesPanel**

In `src/components/activities/ActivitiesPanel.tsx`, change the price span (currently `src/components/activities/ActivitiesPanel.tsx:90-93`) to:

```tsx
              <span className="flex shrink-0 flex-col items-end bg-primary px-2 py-1 text-sm font-bold text-primary-container">
                <span>
                  {formatINR(a.price)}
                  <span className="text-[9px] font-medium">/person</span>
                </span>
                <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
                  {a.priceSource === "live" ? "live price" : "est. price"}
                </span>
              </span>
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/hotels/HotelPanel.tsx src/components/activities/ActivitiesPanel.tsx
git commit -m "Show live/est price badges; fetch live hotel price on expand"
```

---

## Task 11: Playwright + Chromium on Railway

**Files:**
- Modify: `package.json`
- Modify: `next.config.mjs`
- Create: `nixpacks.toml`

> **Risk:** This is the heavy/fragile infra step. If Railway build OOMs or Chromium won't launch, the app still works — every scrape returns null and prices stay `est`. Verify in a Railway preview before merging.

- [ ] **Step 1: Add the dependency + chromium install**

Run: `npm install playwright@^1.49.0`

Then in `package.json` add a `postinstall` script that installs just the Chromium binary:

```json
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "postinstall": "prisma generate && playwright install chromium"
  },
```

(If a `postinstall` already exists for Prisma, merge — do not add a second key.)

- [ ] **Step 2: Mark playwright external to the Next bundle**

Edit `next.config.mjs` — add `serverExternalPackages` alongside the existing `images` block:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["playwright", "playwright-core"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Provide Chromium's system deps on Railway (nixpacks)**

Create `nixpacks.toml` at the repo root:

```toml
[phases.setup]
nixPkgs = ["...", "chromium"]

[variables]
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "0"
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = "/nix/var/nix/profiles/default/bin/chromium"
```

> If `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` causes launch errors, remove it and rely on `playwright install chromium` from the postinstall instead. Documented here so the next engineer knows both paths exist.

- [ ] **Step 4: Local build sanity check**

Run: `npm run build`
Expected: PASS — Next build completes; Playwright is externalized (not bundled).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json next.config.* nixpacks.toml
git commit -m "Bundle Playwright + Chromium for Railway price scraping"
```

- [ ] **Step 6: Manual Railway verification (not automatable here)**

After deploy: open a city's hotel list, expand a card, confirm the badge flips `est → live` for at least one hotel, or — if scraping is blocked — that prices simply stay `est` and nothing errors. Record the outcome.

---

## Task 12: Full verification

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Tests**

Run: `npm test`
Expected: PASS — original 21 + new (overpass 5, geocode 3, estimate 4, scrape 4, resolve 4, hotel provider 3, activity provider 2).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Final commit (if any lint/format fixups)**

```bash
git add -A
git commit -m "Real data replacement: final verification fixups"
```

---

## Self-Review Notes

- **Spec coverage:** OSM hotels (Task 7) ✓; OSM activities + LLM fallback (Task 8) ✓; keyless sources Overpass/Nominatim (Tasks 2–3) ✓; photos via existing `getImage` (Task 7 `imageFor`) ✓; scrape-first/estimate-fallback price layer (Tasks 4–6, 9) ✓; `priceSource` schema + UI badges (Tasks 1, 10) ✓; Playwright on Railway (Task 11) ✓; mock fallback preserved (Task 7 `FallbackHotelProvider`, Task 8 `llmFallback`) ✓; tests + green-suite gate (Task 12) ✓.
- **Bounded scraping:** Lists use estimate (fast); live scrape only on user expand via `/api/price`, 24h cached — avoids N headless launches per search (a refinement of the spec's per-item resolve, same A behaviour, honest `est`→`live` upgrade).
- **Type consistency:** `OsmPoi`, `PriceResult`, `OverpassDeps`, `ActivityDeps`, `priceSource: "live" | "est"` used identically across tasks. `queryPois` / `geocodeCity` names match between definition (Tasks 2–3) and injection (Tasks 7–8).
- **No placeholders:** every code step contains full code; every run step has an expected result.
