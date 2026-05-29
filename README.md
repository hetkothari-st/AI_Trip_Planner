# Voyager — AI Trip Planner

AI-powered trip planner. Region discovery, AI place ranking from web/social, map
routing & route optimization, hotel price comparison, real-time cost calculator, and
exportable itineraries.

This repository is built in **phases**. This release ships the **foundation** plus the
first vertical slice:

> **Destination → AI region discovery → dynamic categories → AI-ranked place banners → live map routing.**

Everything runs **with zero API keys** (deterministic mock data) and transparently
upgrades to real providers when keys are present.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind + shadcn-style UI
- **Prisma + SQLite** (dev) — swap `DATABASE_URL`/provider for Postgres in production
- **Anthropic Claude** for structured AI (region/category/place generation)
- **Mapbox** for the map, routing & travel times (with a keyless schematic fallback)
- **Multi-source research** connectors: Web (Tavily/Brave), YouTube, Reddit

Each external provider degrades gracefully when its key is missing.

## Getting started

```bash
npm install
cp .env.example .env          # optional — app runs without any keys
npx prisma migrate dev        # creates the local SQLite db
npm run dev                   # http://localhost:3000
```

Try the destination **“Uttarakhand”** for the curated demo (Garhwal / Kumaon / Terai).

### Enabling real providers

Add any subset of keys to `.env` (see `.env.example`):

| Key | Enables |
| --- | --- |
| `ANTHROPIC_API_KEY` | Real AI regions/categories/place ranking |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Live Mapbox map + real driving routes/times |
| `TAVILY_API_KEY` / `BRAVE_API_KEY` | Web research signals |
| `YOUTUBE_API_KEY` | YouTube research signals |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | Reddit research signals |
| `UNSPLASH_ACCESS_KEY` | Real banner photos (else placeholder images) |

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build (runs prisma generate)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run test        # vitest
```

## Architecture

- `src/lib/ai/` — `LLMProvider` (Anthropic + deterministic mock), zod schemas, and the
  `discoverRegions` / `generateCategories` / `rankPlaces` functions.
- `src/lib/research/` — pluggable web/YouTube/Reddit connectors + aggregator.
- `src/lib/maps/` — Mapbox directions, route estimate fallback, `optimizeOrder` (TSP).
- `src/lib/images/` — Unsplash + keyless placeholder.
- `src/lib/store/trip.ts` — Zustand wizard state (persisted).
- `src/app/api/*` — thin, zod-validated route handlers.
- `src/components/wizard/*`, `components/map/*`, `components/places/*` — the UI flow.

## Roadmap (subsequent phases)

Per-city mini-itineraries & spot recommendations · hotels with amenities, deep links &
price comparison · real-time cost calculator · multi-city roadmap · start/optional-end
route optimization (Mapbox Optimization API) · activities · professional final itinerary
with PDF/Excel export.
