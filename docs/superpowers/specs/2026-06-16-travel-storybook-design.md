# Travel Storybook — Design Spec

**Date:** 2026-06-16
**Status:** Approved, pending implementation plan
**Author:** brainstorming session

## Context

The AI Trip Planner helps users plan and log trips, but produces nothing they keep
afterward. This feature adds a **Travel Storybook**: a customizable, aesthetic
photo-book / memory keepsake the user builds from a trip's memories — photos, written
notes, tickets (plane/train/bus), souvenirs, the people they travelled with — then
downloads as a print-perfect PDF and (later) orders as a physical copy.

The goal is emotional: each template should evoke memory and memorandum — a souvenir,
not a report. Tens of distinct, customizable templates.

### Decisions locked during brainstorming
- **Scope (v1):** Digital-first. Full builder + uploads + high-quality PDF download.
  "Order physical copy" is a **stub CTA** (records intent, no payment / print partner yet).
- **Editor model:** *Both* fixed-slot templates *and* freeform rearrangement — unified
  into one engine where a template is a preset arrangement of freely-movable elements.
- **Photo storage:** Cloudinary free tier (signed direct browser→Cloudinary uploads).
- **Content seed:** Both — "Start from my trip" (auto-seed from trip data) or "Start blank".
- **PDF generation:** Server-side render via the Playwright/Chromium already bundled for
  price scraping. Pixel-accurate, print-resolution, works for freeform layouts.
- **Auth:** Login required to create/save a book and upload photos. Books are user-scoped.

## Architecture overview

Flow: **create** (from a saved trip or blank) → **pick template** → **edit** (unified
freeform/slot canvas) → **upload** photos/tickets to Cloudinary → **download** print-perfect
PDF → **order physical** = stub CTA.

Book aesthetics are their own independent theme systems (vintage / polaroid / editorial /
boarding-pass / postcard / bauhaus). The app *chrome* (lists, toolbars, dialogs) reuses the
existing neo-brutalist tokens; the *book pages* do not — that contrast is intentional.

The feature is large; the implementation plan will phase it (see Phasing below). This spec
covers the whole feature so the phases share one contract.

## Data model (Prisma — PostgreSQL)

Pages are stored as a **JSON blob**, not relational rows. A page is a background plus an
array of freely-positioned elements in **percent coordinates** (resolution-independent, so
the same data renders to both screen and print without re-layout). A "template" is simply a
preset element array. This natively supports both slot-fill and freeform editing, and matches
the app's existing JSON-snapshot habit (`TripStop.miniItinerary`, `TripSnapshot`).

```prisma
model Storybook {
  id         String   @id @default(cuid())
  userId     String                       // owner (login required)
  title      String
  tripId     String?                      // optional: source trip used to seed
  theme      String                       // theme token id
  sizePreset String   @default("square")  // square | a4-portrait | landscape
  coverUrl   String?
  pages      Json                         // StoryPage[] (see schema below)
  status     String   @default("draft")   // draft | ready
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([userId])
}

model PrintOrder {                          // stub — no payment in v1
  id          String   @id @default(cuid())
  storybookId String
  userId      String
  email       String
  options     Json                          // { size, qty }
  status      String   @default("requested")
  createdAt   DateTime @default(now())
  @@index([userId])
}
```

### Page / element shape (Zod-validated, stored in `pages`)
```
StoryPage   = { id, bg: Background, elements: StoryElement[] }
StoryElement = {
  id, type: "photo" | "text" | "ticket" | "sticker" | "shape",
  x, y, w, h,        // percent of page (0..100)
  rotation,          // degrees
  z,                 // stacking order
  props              // type-specific (below)
}
```
`props` by type:
- **photo / ticket:** `{ url, publicId, fit: "cover"|"contain", caption? }` — `publicId` is the
  Cloudinary id, retained so the asset can be deleted later.
- **text:** `{ text, fontId, size, color, align }`
- **sticker / shape:** `{ kind, color, ... }`

Empty photo/ticket elements (no `url`) render as upload slots — that is the "fixed-slot"
behaviour; the same elements are draggable/resizable, which is the "freeform" behaviour.

## Templates — data, not code

A static registry under `src/lib/storybook/templates/`. Each preset is a typed object:
```
TemplatePreset = { id, name, themeId, category, thumbnail, pages: StoryPage[] }
```
"Tens of templates" delivered combinatorially:
- **~7 layout archetypes:** full-bleed hero · cover · 2×2 photo grid · polaroid cluster ·
  journal (text + photo) · ticket-stub spread · map + caption.
- **~6 themes:** vintage kraft · clean editorial · film/polaroid · postcard · boarding-pass ·
  bauhaus. A theme is `{ palette, fonts, frameStyle, paperTexture }`, applied at render time.

Curated combinations yield 30+ presets. Templates are imported directly (no API endpoint).

The registry must be testable: an integrity test asserts every preset's elements are within
page bounds (0..100), reference valid element types, and name a theme that exists.

## Editor — one engine, both modes

Routes:
- `/storybooks` — "My Books" list (mirrors `/trips`).
- `/storybooks/new` — create flow: choose "Start from my trip" or "Start blank", then pick a template.
- `/storybooks/[id]/edit` — the editor (client component).

Canvas renders a fixed-aspect page (per `sizePreset`); elements are absolutely positioned in
percent coords. Interactions: select · drag · resize (handles) · rotate · z-order · inline
text edit · click-to-upload into a photo/ticket slot · add element (photo/text/ticket/sticker)
· delete · page thumbnail strip (add / reorder / delete pages).

Pointer math is custom (no `dnd-kit`): this is absolute positioning, not list reordering, and
the codebase favours lean dependencies.

State: a new `useStorybook` Zustand store with `persist` (key `voyager-storybook`) holding the
currently-edited book and a dirty flag, plus fire-and-forget autosave (`PUT /api/storybooks/[id]`).
This mirrors the proven sync/hydrate/merge pattern in `src/lib/store/travels.ts` — local store is
the responsive source of truth, DB is durable backing.

## Uploads — Cloudinary

New env vars `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, plus a
`hasCloudinary()` guard in `src/lib/env.ts` (same pattern as `hasUnsplash()` etc.).

Flow:
1. Client requests a signature from `POST /api/storybook/upload-sign` (server signs params with
   the API secret; secret never leaves the server).
2. Client uploads the file **directly browser→Cloudinary** (our server never handles the bytes).
3. Cloudinary returns `secure_url`, `public_id`, dimensions → stored in the element `props`.

Graceful degradation: with no Cloudinary key, upload is disabled with a clear notice; the rest of
the app continues to work (consistent with the "every feature works in mock mode" ethos). Local
object-URL previews are not persisted.

Ticket elements share the upload pipeline and render inside a perforated boarding-pass frame. (OCR
of tickets is explicitly out of scope.)

## PDF export — server Playwright

`GET /api/storybook/[id]/pdf` (runtime `nodejs`, raised `maxDuration`).

The server **serializes the book to a single self-contained HTML string** — inline CSS, theme
fonts, Cloudinary image URLs, one CSS page-break per book page, exact page dimensions. It then
reuses the dynamic-`import("playwright")` pattern from `src/lib/pricing/scrape.ts`:
`chromium.launch()` → `page.setContent(html)` → `page.pdf({ printBackground: true, width, height })`
→ stream `application/pdf` to the browser.

Using `setContent` (not navigating to a live route) avoids any auth/SSR round-trip — the headless
browser needs no session. Chromium is already bundled on Railway and `playwright` is already in
`serverExternalPackages`.

The HTML serializer is pure and unit-tested (markup snapshot). The Playwright launcher itself is
integration-only and untested, exactly like the existing scrape launcher, and must fail safe
(return a clear error, never crash the route).

## Order physical copy — stub

"Order physical copy" opens a modal (size / quantity / price estimate + email capture) →
`POST /api/storybook/[id]/order` writes a `PrintOrder` row with status `requested`. No payment, no
print-partner API. Copy: "Physical printing is coming soon — you're on the list."

## Seed from trip

"Start from my trip" lists the user's saved trips (`useTrips`). The chosen trip's snapshot is run
through a pure builder that produces initial pages:
- **Cover** — destination, dates, cover image.
- **One spread per city/stop** — place photos via existing `getImage` / `getGallery`, name, notes.
- **Companions page**, **"things I brought" page**, **ticket placeholders**.

"Start blank" produces a single empty cover page. The builder is pure (`snapshot → StoryPage[]`)
and unit-tested.

## API surface

All routes are `auth()`-gated; every `[id]` route checks `storybook.userId === session.user.id`
and returns 401/403 appropriately.

| Method | Route | Purpose |
|--------|-------|---------|
| GET / POST | `/api/storybooks` | list my books / create |
| GET / PUT / DELETE | `/api/storybooks/[id]` | load / autosave / delete |
| POST | `/api/storybook/upload-sign` | Cloudinary signed-upload params |
| GET | `/api/storybook/[id]/pdf` | render + download PDF |
| POST | `/api/storybook/[id]/order` | record print-order intent (stub) |

Templates are static imports — no endpoint.

## Testing

Pure, unit-tested:
- Template-registry integrity (elements in-bounds, valid types, theme exists).
- Page / element Zod schema (round-trip, rejects malformed).
- Seed-from-trip builder (snapshot → expected pages).
- Cloudinary signature builder (deterministic given fixed params).
- PDF HTML serializer (markup snapshot, page-break per page, image URLs present).

Integration-only / untested (fail-safe, like `scrape.ts`):
- Playwright PDF launcher.
- Direct browser→Cloudinary upload.

## Phasing (for the implementation plan)

1. **Foundation** — Prisma models + migration, `useStorybook` store, page/element schema,
   CRUD API, `/storybooks` list + `/storybooks/new` create flow.
2. **Templates** — registry, theme tokens, a starter set of presets + integrity test.
3. **Editor** — canvas engine (select/drag/resize/rotate/z/text/add/delete), page thumbnails.
4. **Uploads** — Cloudinary env + `hasCloudinary`, sign endpoint, slot upload, ticket frame.
5. **Seed-from-trip** — pure builder + wiring into the create flow.
6. **PDF** — HTML serializer + Playwright render route + download button.
7. **Order stub** — `PrintOrder` model, modal, order endpoint.

Each phase is independently shippable; later phases degrade gracefully if earlier optional
infra (Cloudinary key) is absent.

## Out of scope (v1)

Payment, print-fulfillment partner integration, ticket OCR, real-time multi-user collaboration,
mobile-native editor gestures beyond basic pointer support.
