# Real Data Replacement — Design

**Date:** 2026-06-04
**Status:** Approved (design); pending spec review
**Goal:** Replace remaining dummy data (hotels + activities) with real free-tier data, with best-effort scraped prices and graceful fallbacks.

## Context

The app already serves LLM-real data (Claude) for regions, categories, places, city-plans, and spots when `ANTHROPIC_API_KEY` is set (it is, on Railway). Images are already real (Wikipedia/Wikimedia Commons), with Picsum as last-resort placeholder.

The true remaining dummy data:

- **Hotels** — `src/lib/hotels/provider.ts` `MockHotelProvider`: 100% seeded fake (names, stars, ratings, prices, coords). No real provider exists.
- **Activities** — `src/lib/ai/mock.ts` `mockActivities()`: 100% seeded fake (templates, providers, prices, ratings).
- Lower priority: `mock.ts` region/place/city fallbacks only fire when the LLM call fails — out of scope for now.

## Constraints (accepted)

- **Free tier only** — no paid APIs, no signup keys. Use keyless OSM (Overpass, Nominatim) + Wikidata/Wikipedia.
- **No free price API exists** for hotels/activities. Prices are best-effort **scraped** (Playwright headless), with a **labeled estimate fallback** so the cost model never breaks ("A" approach: scrape-first, estimate-fallback).
- **Playwright + Chromium bundled on Railway** — heavier deploy (~300 MB, more memory). Accepted. Scrape lives behind one swappable function so it can be flipped to a lighter snippet-price path (Tavily/Brave) without touching providers.
- **Scraping booking sites violates their ToS** — best-effort, low volume, 24h cached. Risk accepted.
- **Every layer falls back** — the app must keep working (mock as final fallback), matching the existing "works without keys" principle.

## Data Sources (keyless)

| Data | Source | Fields |
|------|--------|--------|
| Hotels | OSM Overpass `tourism=hotel/guest_house/hostel` near city center | name, lat/lng, `stars`, amenities (`internet_access`, `swimming_pool`, `air_conditioning`…), address/area |
| Activities | OSM Overpass `leisure`/`sport`/`tourism` (rafting, paragliding, viewpoints, parks) near city | name, lat/lng, category |
| City center | Nominatim (keyless) geocode; fallback to LLM coords already in store | lat/lng |
| Photos | Existing `getImage`/`getGallery` (Wikipedia/Commons), keyed by POI name; Picsum last resort | imageUrl |
| Description enrichment | Wikidata/Wikipedia when OSM is thin | description |

OpenTripMap (free key, richer POIs) is noted as an optional future upgrade — not required.

## Architecture

Slot real providers behind the existing `HotelProvider` interface; add an activity provider mirroring it.

- `src/lib/osm/overpass.ts` (new) — Overpass query builder, bbox-from-center helper, 24h `TTLCache`, descriptive User-Agent, 1 request per city.
- `src/lib/hotels/provider.ts` — add `OverpassHotelProvider implements HotelProvider`. Selector: real first, `MockHotelProvider` as final fallback.
- `src/lib/activities/provider.ts` (new) — `OverpassActivityProvider`; when OSM yields few/none, fall back to **LLM-generated** activities (Claude), then mock as final fallback.
- `src/lib/pricing/resolve.ts` (new) — `resolvePrice()` price layer (below).

## Price Layer (`src/lib/pricing/resolve.ts`)

Per hotel/activity:

1. Check 24h price cache (keyed by name+city).
2. Best-effort **scrape**: Playwright headless, 6s timeout, 1 retry. Parse "from ₹X" off the booking search/listing page.
3. Success → `price`, `priceSource: "live"`, `priceCheckedAt`.
4. Fail / blocked / timeout → **estimate** from stars/category/area → `priceSource: "est"`.
5. Cache outcome 24h (both live and est) to avoid re-scraping per render.

Scrape is isolated behind one function (`scrapePrice()`) so it can be swapped for a Tavily/Brave snippet-price implementation without changing callers ("C" fallback path).

## Schema Changes

- `src/lib/hotels/types.ts` — add `priceSource: "live" | "est"` and optional `priceCheckedAt: number` to `Hotel` and `SitePrice`.
- `src/lib/ai/schemas.ts` — add `priceSource` + optional `priceCheckedAt` to `ActivitySchema`.
- UI — price badge "live" vs "est." next to amounts; existing "Check price →" deep links stay.

## UI Touch Points

- `HotelPanel.tsx` — real hotels, price badge, amenity chips from OSM tags.
- `ActivitiesPanel.tsx` — real/LLM activities, price badge.
- `CostSummary.tsx` / `ItineraryStep.tsx` — cost model unchanged (price is always a number); optional "est." note where estimated prices contribute.

## Error Handling & Safety

- Overpass/Nominatim: descriptive User-Agent, cache + 1 req/city, handle timeouts/5xx → fall back.
- Scrape: short timeout, try/catch, never throw to caller → estimate fallback.
- Every provider chain ends in mock so the app never shows an empty state due to a failed upstream.

## Testing

- Unit: Overpass JSON → `Hotel`/`Activity` mapping; estimate formula; cache TTL; price-source tagging. Mock `fetch`.
- Scrape: unit-test the parser against a saved HTML fixture (not live).
- Keep existing 21 tests green. Mock providers stay for tests + offline/dev.

## Out of Scope

- Replacing LLM region/place/city fallbacks (only fire on LLM failure).
- Real availability/booking (no free API). Deep links only.
- Paid providers (Amadeus/Booking/RapidAPI).

## Build Sequence (high level)

1. `osm/overpass.ts` + Nominatim geocode helper + tests.
2. `OverpassHotelProvider` + selector wiring + tests.
3. `pricing/resolve.ts` with estimate path + tests (scrape stubbed).
4. Playwright scrape (`scrapePrice`) + Railway deploy config + parser fixture test.
5. `OverpassActivityProvider` + LLM fallback.
6. Schema + UI badges (`priceSource`).
7. End-to-end check; keep all tests green.
