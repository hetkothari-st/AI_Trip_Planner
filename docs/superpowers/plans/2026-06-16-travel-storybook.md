# Travel Storybook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login-gated Travel Storybook: users build a customizable, aesthetic photo-book from a trip's memories (photos, notes, tickets, souvenirs, people), edit it in a freeform/slot canvas, and download a print-perfect PDF. "Order physical copy" is a stub.

**Architecture:** A book is a `Storybook` Prisma row whose `pages` is a JSON array of pages; each page holds freely-positioned elements in percent coordinates. Templates are static typed presets (layout × theme). A Zustand store mirrors the existing `travels.ts` local-first + fire-and-forget-sync pattern. PDF is rendered server-side by serializing the book to HTML and feeding it to the already-bundled Playwright/Chromium (same dynamic-import pattern as `scrape.ts`). Uploads go browser→Cloudinary via a server-signed request.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma/PostgreSQL, Zustand+persist, Zod, NextAuth v5 (`auth()`), Tailwind (neo-brutalist chrome), Playwright (PDF), Cloudinary (uploads), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-16-travel-storybook-design.md`

**Conventions (read before starting):**
- Tests are colocated `*.test.ts`, run with `npx vitest run <path>`. Full suite: `npm test`.
- Typecheck: `npm run typecheck`. Lint: `npm run lint`.
- DB client: `import { prisma } from "@/lib/db"`. Auth: `import { auth } from "@/auth"`.
- API routes export `const runtime = "nodejs"`, Zod-`safeParse` the body, return `NextResponse.json`.
- Env guards live in `src/lib/env.ts` (`hasUnsplash()` style). Follow that exact shape.
- Pure logic is unit-tested; live launchers (Playwright, network upload) are integration-only and must fail safe, exactly like `src/lib/pricing/scrape.ts`.

---

## File Structure

**Created:**
- `src/lib/storybook/types.ts` — Zod schemas + TS types for pages/elements/storybook (single source of truth).
- `src/lib/storybook/seed.ts` — pure `snapshotToPages(snapshot) → StoryPage[]` and `blankPages() → StoryPage[]`.
- `src/lib/storybook/cloudinary.ts` — pure `signUploadParams(params, secret) → { signature, ... }`.
- `src/lib/storybook/serialize.ts` — pure `bookToHtml(book) → string` for PDF.
- `src/lib/storybook/pdf.ts` — Playwright launcher `htmlToPdf(html, size) → Buffer | null` (integration-only).
- `src/lib/storybook/templates/index.ts` — template registry + lookup.
- `src/lib/storybook/templates/themes.ts` — theme token table.
- `src/lib/storybook/templates/presets.ts` — the concrete `TemplatePreset[]`.
- `src/lib/store/storybook.ts` — `useStorybook` Zustand store.
- `src/app/api/storybooks/route.ts` — GET list / POST create.
- `src/app/api/storybooks/[id]/route.ts` — GET / PUT / DELETE one book.
- `src/app/api/storybook/upload-sign/route.ts` — POST Cloudinary signature.
- `src/app/api/storybook/[id]/pdf/route.ts` — GET render PDF.
- `src/app/api/storybook/[id]/order/route.ts` — POST order intent.
- `src/app/storybooks/page.tsx` — "My Books" list.
- `src/app/storybooks/new/page.tsx` — create flow (from trip / blank → template).
- `src/app/storybooks/[id]/edit/page.tsx` — editor shell.
- `src/components/storybook/PageCanvas.tsx` — renders one page (used by editor + thumbnails).
- `src/components/storybook/ElementView.tsx` — renders one element by type.
- `src/components/storybook/EditorToolbar.tsx` — add-element / theme / download / order controls.
- `src/components/storybook/PhotoUpload.tsx` — slot upload widget (Cloudinary).
- `src/components/storybook/OrderModal.tsx` — print-order stub modal.

**Modified:**
- `prisma/schema.prisma` — add `Storybook`, `PrintOrder` models.
- `src/lib/env.ts` — add `cloudinary*` env + `hasCloudinary()`.
- `src/components/layout/TopNav.tsx` (or wherever nav links live) — add "Storybooks" link.
- `next.config.mjs` — add `res.cloudinary.com` to image remote patterns (if `next/image` used; we use `<img>`, so only if needed).

**Core types (defined in Task 1, referenced everywhere):**
```ts
type ElementType = "photo" | "text" | "ticket" | "sticker" | "shape";
interface StoryElement {
  id: string;
  type: ElementType;
  x: number; y: number; w: number; h: number;   // percent of page, 0..100
  rotation: number;                              // degrees
  z: number;                                     // stacking order
  props: Record<string, unknown>;                // type-specific (see schema)
}
interface StoryPage { id: string; bg: string; elements: StoryElement[] }
interface Storybook {
  id: string; userId: string; title: string; tripId?: string;
  theme: string; sizePreset: "square" | "a4-portrait" | "landscape";
  coverUrl?: string; pages: StoryPage[]; status: "draft" | "ready";
  createdAt: string; updatedAt: string;
}
```

---

# Phase 1 — Foundation (data model, schema, store, CRUD, list/create)

## Task 1: Page/element/storybook schema

**Files:**
- Create: `src/lib/storybook/types.ts`
- Test: `src/lib/storybook/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { StoryPageSchema, StorybookSchema, PhotoPropsSchema } from "./types";

const photoEl = {
  id: "e1", type: "photo", x: 10, y: 10, w: 40, h: 30, rotation: 0, z: 1,
  props: { url: "https://x/y.jpg", publicId: "y", fit: "cover" },
};
const page = { id: "p1", bg: "#fff", elements: [photoEl] };

describe("storybook schema", () => {
  it("accepts a valid page", () => {
    expect(StoryPageSchema.parse(page)).toMatchObject({ id: "p1" });
  });
  it("rejects element coords outside 0..100", () => {
    expect(() => StoryPageSchema.parse({ ...page, elements: [{ ...photoEl, x: 140 }] })).toThrow();
  });
  it("rejects unknown element type", () => {
    expect(() => StoryPageSchema.parse({ ...page, elements: [{ ...photoEl, type: "video" }] })).toThrow();
  });
  it("validates photo props (url required when present)", () => {
    expect(PhotoPropsSchema.parse({ fit: "cover" })).toMatchObject({ fit: "cover" });
    expect(() => PhotoPropsSchema.parse({ url: 123 })).toThrow();
  });
  it("accepts a full storybook", () => {
    const book = {
      id: "b1", userId: "u1", title: "Goa", theme: "polaroid",
      sizePreset: "square", pages: [page], status: "draft",
      createdAt: "2026-06-16T00:00:00Z", updatedAt: "2026-06-16T00:00:00Z",
    };
    expect(StorybookSchema.parse(book).title).toBe("Goa");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/storybook/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Implement the schema**

```ts
import { z } from "zod";

export const ElementTypeSchema = z.enum(["photo", "text", "ticket", "sticker", "shape"]);
export type ElementType = z.infer<typeof ElementTypeSchema>;

const pct = z.number().min(0).max(100);

// Photo + ticket share the same media props. url/publicId absent => empty upload slot.
export const PhotoPropsSchema = z.object({
  url: z.string().url().optional(),
  publicId: z.string().optional(),
  fit: z.enum(["cover", "contain"]).default("cover"),
  caption: z.string().max(200).optional(),
});
export const TextPropsSchema = z.object({
  text: z.string().default(""),
  fontId: z.string().default("body"),
  size: z.number().min(6).max(200).default(16),
  color: z.string().default("#1a1a1a"),
  align: z.enum(["left", "center", "right"]).default("left"),
});
export const ShapePropsSchema = z.object({
  kind: z.string().default("rect"),
  color: z.string().default("#ffcc00"),
});

export const StoryElementSchema = z.object({
  id: z.string(),
  type: ElementTypeSchema,
  x: pct, y: pct, w: pct, h: pct,
  rotation: z.number().default(0),
  z: z.number().int().default(0),
  props: z.record(z.unknown()).default({}),
});
export type StoryElement = z.infer<typeof StoryElementSchema>;

export const StoryPageSchema = z.object({
  id: z.string(),
  bg: z.string().default("#ffffff"),
  elements: z.array(StoryElementSchema).default([]),
});
export type StoryPage = z.infer<typeof StoryPageSchema>;

export const SizePresetSchema = z.enum(["square", "a4-portrait", "landscape"]);
export type SizePreset = z.infer<typeof SizePresetSchema>;

export const StorybookSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(120),
  tripId: z.string().optional(),
  theme: z.string(),
  sizePreset: SizePresetSchema.default("square"),
  coverUrl: z.string().optional(),
  pages: z.array(StoryPageSchema).default([]),
  status: z.enum(["draft", "ready"]).default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Storybook = z.infer<typeof StorybookSchema>;

// Body the client PUTs to save edits (no server-owned fields).
export const StorybookSaveSchema = StorybookSchema.pick({
  title: true, theme: true, sizePreset: true, coverUrl: true, pages: true, status: true,
}).partial({ coverUrl: true, status: true });
export type StorybookSave = z.infer<typeof StorybookSaveSchema>;

// Pixel dimensions per size preset (used by canvas + PDF).
export const SIZE_DIMS: Record<SizePreset, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  "a4-portrait": { w: 794, h: 1123 },   // A4 @ 96dpi
  landscape: { w: 1280, h: 720 },
};
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run src/lib/storybook/types.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storybook/types.ts src/lib/storybook/types.test.ts
git commit -m "Add storybook page/element/book Zod schema"
```

## Task 2: Prisma models

**Files:**
- Modify: `prisma/schema.prisma` (append two models)

- [ ] **Step 1: Add the models** (append to the end of `prisma/schema.prisma`)

```prisma
// Travel storybook — a customizable photo-book the user builds from a trip's memories.
model Storybook {
  id         String   @id @default(cuid())
  userId     String
  title      String
  tripId     String?
  theme      String
  sizePreset String   @default("square")
  coverUrl   String?
  pages      Json     @default("[]")
  status     String   @default("draft")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
}

// Print-order intent (stub — no payment / fulfillment in v1).
model PrintOrder {
  id          String   @id @default(cuid())
  storybookId String
  userId      String
  email       String
  options     Json     @default("{}")
  status      String   @default("requested")
  createdAt   DateTime @default(now())

  @@index([userId])
}
```

- [ ] **Step 2: Create the migration**

Run: `npm run db:migrate -- --name add_storybook`
Expected: a new folder under `prisma/migrations/`, and `prisma generate` runs. If no dev DB is reachable, run `npx prisma generate` to refresh the client and create the migration SQL manually mirroring the models.

- [ ] **Step 3: Verify the client typechecks**

Run: `npm run typecheck`
Expected: PASS (no usages yet; just confirms generate succeeded).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add Storybook and PrintOrder Prisma models"
```

## Task 3: `useStorybook` Zustand store

**Files:**
- Create: `src/lib/store/storybook.ts`
- Test: `src/lib/store/storybook.test.ts`

Mirror `src/lib/store/travels.ts`: local state is the responsive source of truth; mutations fire-and-forget a debounced `PUT`. Test the pure reducers by calling actions on the store and asserting state (no network).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStorybook } from "./storybook";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })));
  useStorybook.setState({ book: null, dirty: false });
});

const book = {
  id: "b1", userId: "u1", title: "Goa", theme: "polaroid", sizePreset: "square",
  pages: [{ id: "p1", bg: "#fff", elements: [] }], status: "draft",
  createdAt: "2026-06-16T00:00:00Z", updatedAt: "2026-06-16T00:00:00Z",
};

describe("useStorybook", () => {
  it("loads a book", () => {
    useStorybook.getState().setBook(book as any);
    expect(useStorybook.getState().book?.title).toBe("Goa");
  });
  it("adds an element to a page", () => {
    useStorybook.getState().setBook(book as any);
    useStorybook.getState().addElement("p1", { type: "text", x: 5, y: 5, w: 30, h: 10 });
    const els = useStorybook.getState().book!.pages[0].elements;
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("text");
    expect(useStorybook.getState().dirty).toBe(true);
  });
  it("updates an element", () => {
    useStorybook.getState().setBook(book as any);
    const id = useStorybook.getState().addElement("p1", { type: "text", x: 0, y: 0, w: 10, h: 10 });
    useStorybook.getState().updateElement("p1", id, { x: 50 });
    expect(useStorybook.getState().book!.pages[0].elements[0].x).toBe(50);
  });
  it("removes an element", () => {
    useStorybook.getState().setBook(book as any);
    const id = useStorybook.getState().addElement("p1", { type: "text", x: 0, y: 0, w: 10, h: 10 });
    useStorybook.getState().removeElement("p1", id);
    expect(useStorybook.getState().book!.pages[0].elements).toHaveLength(0);
  });
  it("adds and removes pages", () => {
    useStorybook.getState().setBook(book as any);
    useStorybook.getState().addPage();
    expect(useStorybook.getState().book!.pages).toHaveLength(2);
    useStorybook.getState().removePage(useStorybook.getState().book!.pages[1].id);
    expect(useStorybook.getState().book!.pages).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/store/storybook.test.ts`
Expected: FAIL — cannot find module `./storybook`.

- [ ] **Step 3: Implement the store**

```ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Storybook, StoryElement } from "@/lib/storybook/types";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

type NewElement = Pick<StoryElement, "type" | "x" | "y" | "w" | "h"> & Partial<StoryElement>;

interface StorybookState {
  book: Storybook | null;
  dirty: boolean;
  setBook: (b: Storybook) => void;
  addElement: (pageId: string, el: NewElement) => string;
  updateElement: (pageId: string, elId: string, patch: Partial<StoryElement>) => void;
  removeElement: (pageId: string, elId: string) => void;
  addPage: () => void;
  removePage: (pageId: string) => void;
  setTheme: (theme: string) => void;
  save: () => void;
}

// Debounced fire-and-forget save (local store is source of truth, DB is durable backing).
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(get: () => StorybookState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => get().save(), 800);
}

function mapPage<T extends StorybookState>(s: T, pageId: string, fn: (p: Storybook["pages"][number]) => Storybook["pages"][number]): Partial<T> {
  if (!s.book) return {};
  const pages = s.book.pages.map((p) => (p.id === pageId ? fn(p) : p));
  return { book: { ...s.book, pages }, dirty: true } as Partial<T>;
}

export const useStorybook = create<StorybookState>()(
  persist(
    (set, get) => ({
      book: null,
      dirty: false,

      setBook: (b) => set({ book: b, dirty: false }),

      addElement: (pageId, el) => {
        const id = uid();
        const z = (get().book?.pages.find((p) => p.id === pageId)?.elements.length ?? 0) + 1;
        const full: StoryElement = { id, rotation: 0, z, props: {}, ...el };
        set((s) => mapPage(s, pageId, (p) => ({ ...p, elements: [...p.elements, full] })));
        scheduleSave(get);
        return id;
      },

      updateElement: (pageId, elId, patch) => {
        set((s) =>
          mapPage(s, pageId, (p) => ({
            ...p,
            elements: p.elements.map((e) => (e.id === elId ? { ...e, ...patch, id: elId } : e)),
          })),
        );
        scheduleSave(get);
      },

      removeElement: (pageId, elId) => {
        set((s) => mapPage(s, pageId, (p) => ({ ...p, elements: p.elements.filter((e) => e.id !== elId) })));
        scheduleSave(get);
      },

      addPage: () => {
        set((s) => (s.book ? { book: { ...s.book, pages: [...s.book.pages, { id: uid(), bg: "#ffffff", elements: [] }] }, dirty: true } : {}));
        scheduleSave(get);
      },

      removePage: (pageId) => {
        set((s) => (s.book ? { book: { ...s.book, pages: s.book.pages.filter((p) => p.id !== pageId) }, dirty: true } : {}));
        scheduleSave(get);
      },

      setTheme: (theme) => {
        set((s) => (s.book ? { book: { ...s.book, theme }, dirty: true } : {}));
        scheduleSave(get);
      },

      save: () => {
        const { book } = get();
        if (!book) return;
        fetch(`/api/storybooks/${book.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: book.title, theme: book.theme, sizePreset: book.sizePreset,
            coverUrl: book.coverUrl, pages: book.pages, status: book.status,
          }),
        }).catch(() => {});
        set({ dirty: false });
      },
    }),
    { name: "voyager-storybook" },
  ),
);
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run src/lib/store/storybook.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/store/storybook.ts src/lib/store/storybook.test.ts
git commit -m "Add useStorybook store with element/page reducers and debounced save"
```

## Task 4: CRUD API — list & create

**Files:**
- Create: `src/app/api/storybooks/route.ts`

No unit test (thin DB+auth glue, matching the untested style of other route handlers). Verify by typecheck + manual curl in the Phase 1 verification.

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { blankPages } from "@/lib/storybook/seed";

export const runtime = "nodejs";

const CreateBody = z.object({
  title: z.string().min(1).max(120),
  theme: z.string().min(1),
  sizePreset: z.enum(["square", "a4-portrait", "landscape"]).default("square"),
  tripId: z.string().optional(),
  pages: z.array(z.any()).optional(), // seeded pages from client, validated on save
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const books = await prisma.storybook.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, theme: true, coverUrl: true, status: true, updatedAt: true },
  });
  return NextResponse.json({ books });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { title, theme, sizePreset, tripId, pages } = parsed.data;
  const book = await prisma.storybook.create({
    data: { userId, title, theme, sizePreset, tripId, pages: pages ?? blankPages() },
  });
  return NextResponse.json({ id: book.id });
}
```

- [ ] **Step 2: Add a minimal `blankPages` so this imports** (full version in Task 12; stub now)

Create `src/lib/storybook/seed.ts` with just:
```ts
import type { StoryPage } from "./types";
export function blankPages(): StoryPage[] {
  return [{ id: `p_${Math.random().toString(36).slice(2)}`, bg: "#ffffff", elements: [] }];
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/storybooks/route.ts src/lib/storybook/seed.ts
git commit -m "Add storybook list/create API"
```

## Task 5: CRUD API — get / save / delete one book

**Files:**
- Create: `src/app/api/storybooks/[id]/route.ts`

- [ ] **Step 1: Implement** (note: dynamic `params` is a Promise in Next 15, per `api/trip/[id]`)

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { StorybookSaveSchema } from "@/lib/storybook/types";

export const runtime = "nodejs";

async function ownedBook(id: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const book = await prisma.storybook.findUnique({ where: { id } });
  if (!book || book.userId !== userId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { userId, book };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedBook(id);
  if (r.error) return r.error;
  return NextResponse.json({ book: r.book });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedBook(id);
  if (r.error) return r.error;
  const parsed = StorybookSaveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { coverUrl, status, ...rest } = parsed.data;
  await prisma.storybook.update({
    where: { id },
    data: { ...rest, coverUrl, status, pages: parsed.data.pages },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedBook(id);
  if (r.error) return r.error;
  await prisma.storybook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/storybooks/[id]/route.ts"
git commit -m "Add storybook get/save/delete API with ownership checks"
```

## Task 6: "My Books" list page

**Files:**
- Create: `src/app/storybooks/page.tsx`
- Modify: nav component (add a "Storybooks" link — find it via `grep -rl "Trips" src/components`).

Client component. Fetch `GET /api/storybooks`, render a neo-brutalist card grid (reuse `.neo` / `border-2 border-primary` classes seen in `HotelPanel`). Each card: cover (or placeholder), title, status badge, "Edit" link to `/storybooks/[id]/edit`, delete button (`DELETE`). A "New Storybook" button links to `/storybooks/new`. If `GET` returns 401, show a "sign in to view your storybooks" state with a link to `/login`.

- [ ] **Step 1: Implement** the page following the `/trips` page structure (`src/app/trips/*`). Use `useEffect` + `fetch`, `useState` for the list, `lucide-react` icons (`BookOpen`, `Plus`, `Trash2`).

- [ ] **Step 2: Add the nav link** next to the existing Trips/Travels links.

- [ ] **Step 3: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/storybooks/page.tsx src/components
git commit -m "Add My Storybooks list page and nav link"
```

## Task 7: Create flow page

**Files:**
- Create: `src/app/storybooks/new/page.tsx`

Two-step client flow:
1. **Source:** "Start from my trip" (lists `useTrips().trips`, pick one) or "Start blank".
2. **Template:** grid of `listTemplates()` thumbnails (Task 8). On confirm, `POST /api/storybooks` with `{ title, theme: preset.themeId, sizePreset, tripId?, pages }`. For "from trip", `pages` = `snapshotToPages(trip.snapshot, preset)` (Task 12); for blank, `pages` = `applyTemplate(preset)` (the preset's own pages). Then `router.push("/storybooks/<id>/edit")`.

Until Tasks 8 & 12 land, gate the template grid behind a simple hardcoded single option so the page compiles; wire the real registry in Task 9's integration step.

- [ ] **Step 1: Implement** the two-step flow with `useState` step machine. Reuse trip list from `useTrips`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/storybooks/new/page.tsx
git commit -m "Add storybook create flow (from trip / blank → template)"
```

**Phase 1 verification (manual):** Run `npm run dev`, sign in, visit `/storybooks`, create a blank book, confirm it appears in the list and a row exists in the DB (`npx prisma studio`).

---

# Phase 2 — Templates (registry, themes, presets)

## Task 8: Theme tokens + template types

**Files:**
- Create: `src/lib/storybook/templates/themes.ts`
- Create: `src/lib/storybook/templates/index.ts` (types + lookup; presets imported in Task 9)
- Test: `src/lib/storybook/templates/templates.test.ts` (filled in Task 9)

- [ ] **Step 1: Implement themes**

```ts
export interface Theme {
  id: string;
  name: string;
  palette: { paper: string; ink: string; accent: string };
  fonts: { display: string; body: string };
  frameStyle: "none" | "polaroid" | "kraft" | "postcard" | "ticket" | "editorial";
  paperTexture?: string; // optional CSS background
}

export const THEMES: Record<string, Theme> = {
  "vintage-kraft": { id: "vintage-kraft", name: "Vintage Kraft", palette: { paper: "#d8c3a5", ink: "#3a2e1f", accent: "#a8412c" }, fonts: { display: "'Space Grotesk', serif", body: "Georgia, serif" }, frameStyle: "kraft" },
  "clean-editorial": { id: "clean-editorial", name: "Clean Editorial", palette: { paper: "#faf8f4", ink: "#1a1a1a", accent: "#0055ff" }, fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "editorial" },
  "film-polaroid": { id: "film-polaroid", name: "Film / Polaroid", palette: { paper: "#f4f1ea", ink: "#222", accent: "#e63b2e" }, fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "polaroid" },
  postcard: { id: "postcard", name: "Postcard", palette: { paper: "#fffdf7", ink: "#2b2b2b", accent: "#0a7d6b" }, fonts: { display: "'Space Grotesk', serif", body: "Georgia, serif" }, frameStyle: "postcard" },
  "boarding-pass": { id: "boarding-pass", name: "Boarding Pass", palette: { paper: "#f7f7f7", ink: "#101010", accent: "#0055ff" }, fonts: { display: "'Space Grotesk', monospace", body: "monospace" }, frameStyle: "ticket" },
  bauhaus: { id: "bauhaus", name: "Bauhaus", palette: { paper: "#f5f0e8", ink: "#1a1a1a", accent: "#ffcc00" }, fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "none" },
};

export function getTheme(id: string): Theme {
  return THEMES[id] ?? THEMES["clean-editorial"];
}
```

- [ ] **Step 2: Implement registry types + lookup** (`templates/index.ts`)

```ts
import type { StoryPage } from "../types";
import { PRESETS } from "./presets";
export { THEMES, getTheme } from "./themes";
export type { Theme } from "./themes";

export interface TemplatePreset {
  id: string;
  name: string;
  themeId: string;
  category: string;         // e.g. "cover", "grid", "polaroid", "journal", "ticket", "map"
  thumbnail: string;        // /img path or data URI
  pages: StoryPage[];
}

export function listTemplates(): TemplatePreset[] {
  return PRESETS;
}
export function getTemplate(id: string): TemplatePreset | undefined {
  return PRESETS.find((t) => t.id === id);
}
// A blank book seeded from a template = a deep copy of its pages with fresh ids.
export function applyTemplate(preset: TemplatePreset): StoryPage[] {
  return preset.pages.map((p) => ({
    ...p,
    id: `p_${Math.random().toString(36).slice(2)}`,
    elements: p.elements.map((e) => ({ ...e, id: `e_${Math.random().toString(36).slice(2)}` })),
  }));
}
```

- [ ] **Step 3: Typecheck** (will fail until presets exist — that's Task 9). Skip running here; commit after Task 9.

## Task 9: Concrete presets + integrity test

**Files:**
- Create: `src/lib/storybook/templates/presets.ts`
- Test: `src/lib/storybook/templates/templates.test.ts`

Build presets combinatorially: define ~7 layout archetypes as functions `(themeId) => StoryPage[]`, then instantiate each across a curated subset of themes to yield 30+ presets. Each archetype uses only in-bounds percent coords and valid element types. Empty photo elements (no `props.url`) are upload slots.

- [ ] **Step 1: Write the integrity test first**

```ts
import { describe, it, expect } from "vitest";
import { listTemplates, getTemplate, THEMES } from "./index";
import { StoryPageSchema } from "../types";

describe("template registry", () => {
  const all = listTemplates();
  it("has at least 30 presets", () => {
    expect(all.length).toBeGreaterThanOrEqual(30);
  });
  it("every preset has a unique id", () => {
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
  });
  it("every preset references an existing theme", () => {
    for (const t of all) expect(THEMES[t.themeId], t.id).toBeDefined();
  });
  it("every page validates and every element is in 0..100 bounds", () => {
    for (const t of all) {
      for (const p of t.pages) {
        expect(() => StoryPageSchema.parse(p), `${t.id}`).not.toThrow();
        for (const e of p.elements) {
          expect(e.x + e.w, `${t.id}/${e.id}`).toBeLessThanOrEqual(100.001);
          expect(e.y + e.h, `${t.id}/${e.id}`).toBeLessThanOrEqual(100.001);
        }
      }
    }
  });
  it("getTemplate finds by id", () => {
    expect(getTemplate(all[0].id)?.id).toBe(all[0].id);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/storybook/templates/templates.test.ts`
Expected: FAIL — cannot find module `./presets`.

- [ ] **Step 3: Implement presets**

```ts
import type { StoryPage } from "../types";
import type { TemplatePreset } from "./index";

let n = 0;
const eid = () => `e${n++}`;
const txt = (x: number, y: number, w: number, h: number, text: string, size = 28): StoryPage["elements"][number] =>
  ({ id: eid(), type: "text", x, y, w, h, rotation: 0, z: 5, props: { text, size, fontId: "display", align: "center", color: "#1a1a1a" } });
const slot = (x: number, y: number, w: number, h: number, kind: "photo" | "ticket" = "photo", rot = 0): StoryPage["elements"][number] =>
  ({ id: eid(), type: kind, x, y, w, h, rotation: rot, z: 1, props: { fit: "cover" } });

// 7 layout archetypes — each returns the pages for one template in the given theme.
const archetypes: Record<string, (paper: string) => StoryPage[]> = {
  cover: (bg) => [{ id: "p", bg, elements: [slot(0, 0, 100, 70), txt(10, 74, 80, 14, "Our Trip")] }],
  hero: (bg) => [{ id: "p", bg, elements: [slot(0, 0, 100, 100), txt(8, 80, 84, 12, "Caption", 22)] }],
  grid: (bg) => [{ id: "p", bg, elements: [slot(4, 4, 44, 44), slot(52, 4, 44, 44), slot(4, 52, 44, 44), slot(52, 52, 44, 44)] }],
  polaroid: (bg) => [{ id: "p", bg, elements: [slot(6, 8, 38, 40, "photo", -6), slot(52, 14, 38, 40, "photo", 5), slot(28, 52, 38, 40, "photo", -2)] }],
  journal: (bg) => [{ id: "p", bg, elements: [slot(6, 6, 50, 88), txt(60, 10, 36, 80, "Write your memory here...", 18)] }],
  ticket: (bg) => [{ id: "p", bg, elements: [slot(8, 8, 84, 36, "ticket"), slot(8, 50, 84, 36, "ticket")] }],
  map: (bg) => [{ id: "p", bg, elements: [slot(0, 0, 100, 60), txt(8, 64, 84, 24, "Where we went", 20)] }],
};

const archetypeOrder = ["cover", "hero", "grid", "polaroid", "journal", "ticket", "map"];
// Curated archetype × theme pairs (yields 30+). Each theme gets every archetype.
const themeIds = ["vintage-kraft", "clean-editorial", "film-polaroid", "postcard", "boarding-pass", "bauhaus"];
const paperOf: Record<string, string> = {
  "vintage-kraft": "#d8c3a5", "clean-editorial": "#faf8f4", "film-polaroid": "#f4f1ea",
  postcard: "#fffdf7", "boarding-pass": "#f7f7f7", bauhaus: "#f5f0e8",
};

export const PRESETS: TemplatePreset[] = themeIds.flatMap((themeId) =>
  archetypeOrder.map((arch) => {
    n = 0; // reset element-id counter per preset for stable ids
    return {
      id: `${themeId}-${arch}`,
      name: `${arch[0].toUpperCase()}${arch.slice(1)} — ${themeId.replace("-", " ")}`,
      themeId,
      category: arch,
      thumbnail: `/storybook-thumbs/${themeId}-${arch}.svg`,
      pages: archetypes[arch](paperOf[themeId]),
    };
  }),
);
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/storybook/templates/templates.test.ts`
Expected: PASS (5 tests; 6 themes × 7 archetypes = 42 presets ≥ 30).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Wire the real registry into the create flow** (Task 7's template grid): import `listTemplates`, render thumbnails (a CSS preview of `preset.pages[0]` is fine if SVG thumbs don't exist yet — render a small `PageCanvas` from Task 10 once available, else a colored card showing the theme paper + name).

- [ ] **Step 7: Commit**

```bash
git add src/lib/storybook/templates
git commit -m "Add storybook template registry: 6 themes x 7 archetypes with integrity test"
```

---

# Phase 3 — Editor engine

## Task 10: `ElementView` + `PageCanvas` (render only)

**Files:**
- Create: `src/components/storybook/ElementView.tsx`
- Create: `src/components/storybook/PageCanvas.tsx`

Render a page read-only (no interaction yet). `PageCanvas` takes `{ page, theme, dims, scale }`, renders an absolutely-positioned box per element using percent → CSS `left/top/width/height` + `rotate`. `ElementView` switches on `type`: photo/ticket → `<img>` (or empty slot placeholder with a dashed border + "＋ Add photo"), text → styled `<div>`, shape → colored box. Ticket frame uses the theme `frameStyle === "ticket"` perforation. This component is shared by the editor, the create-flow thumbnails, and (string-rendered) the PDF serializer's reference markup.

- [ ] **Step 1: Implement** both components. `PageCanvas` outer box uses `position: relative; width/height` from `dims * scale`. Each element: `position:absolute; left:${x}%; top:${y}%; width:${w}%; height:${h}%; transform:rotate(${rotation}deg); z-index:${z}`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/storybook/ElementView.tsx src/components/storybook/PageCanvas.tsx
git commit -m "Add read-only PageCanvas and ElementView"
```

## Task 11: Editor shell with interaction (select/drag/resize/rotate/text/add/delete/pages)

**Files:**
- Create: `src/app/storybooks/[id]/edit/page.tsx`
- Create: `src/components/storybook/EditorToolbar.tsx`

Client editor. On mount: `GET /api/storybooks/[id]` → `useStorybook().setBook`. Render the active `PageCanvas` at an editable scale, a page-thumbnail strip (click to switch, "+" to `addPage`, trash to `removePage`), and `EditorToolbar`. Interactions, all via pointer events on the selected element, converting pixel deltas to percent (`deltaPx / canvasPx * 100`) and calling `updateElement`:
- **Select:** click element → `selectedId`.
- **Drag:** pointerdown on body → move → `updateElement(x,y)`.
- **Resize:** 4 corner handles → `updateElement(w,h)` (+ x/y for top/left handles).
- **Rotate:** a handle above the box → `updateElement(rotation)` from angle to center.
- **Text edit:** double-click a text element → `contentEditable`, on blur `updateElement(props.text)`.
- **Add element:** toolbar buttons → `addElement(pageId, {type, x:30,y:30,w:30,h:20})`.
- **Delete:** Delete key or toolbar → `removeElement`.
Toolbar also has: theme switcher (`setTheme`), "Download PDF" (Task 14), "Order print" (Task 15). Keep math in small pure helpers so they could be unit-tested later, but interaction wiring itself is manual-verified.

- [ ] **Step 1: Implement** the editor + toolbar.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Then `npm run dev`, open a book, confirm drag/resize/rotate/add/delete and autosave (network tab shows debounced `PUT`).

- [ ] **Step 3: Commit**

```bash
git add "src/app/storybooks/[id]/edit/page.tsx" src/components/storybook/EditorToolbar.tsx
git commit -m "Add storybook editor: select/drag/resize/rotate/text/add/delete/pages"
```

---

# Phase 4 — Uploads (Cloudinary)

## Task 12: Cloudinary env + signature

**Files:**
- Modify: `src/lib/env.ts`
- Create: `src/lib/storybook/cloudinary.ts`
- Test: `src/lib/storybook/cloudinary.test.ts`

- [ ] **Step 1: Add env** (append to `env` object + guards in `src/lib/env.ts`)

```ts
  cloudinaryCloud: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinarySecret: process.env.CLOUDINARY_API_SECRET ?? "",
```
```ts
export const hasCloudinary = () =>
  env.cloudinaryCloud.length > 0 && env.cloudinaryKey.length > 0 && env.cloudinarySecret.length > 0;
```

- [ ] **Step 2: Write the failing test** (Cloudinary signs the sorted `key=value` param string + secret with SHA-1)

```ts
import { describe, it, expect } from "vitest";
import { buildSignature } from "./cloudinary";

describe("cloudinary signature", () => {
  it("signs sorted params with sha1(params+secret)", () => {
    // Cloudinary's documented example: timestamp=1315060510&public_id=sample + secret "abcd"
    const sig = buildSignature({ public_id: "sample", timestamp: 1315060510 }, "abcd");
    expect(sig).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
  it("ignores empty values and sorts keys", () => {
    const a = buildSignature({ b: "2", a: "1" }, "x");
    const b = buildSignature({ a: "1", b: "2", c: "" }, "x");
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run src/lib/storybook/cloudinary.test.ts`
Expected: FAIL — cannot find module `./cloudinary`.

- [ ] **Step 4: Implement** (Node `crypto`, no new dep)

```ts
import { createHash } from "crypto";

/** Cloudinary signed-upload signature: sha1 of `k=v&...` (sorted, non-empty) + apiSecret. */
export function buildSignature(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run src/lib/storybook/cloudinary.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/storybook/cloudinary.ts src/lib/storybook/cloudinary.test.ts
git commit -m "Add Cloudinary env guard and signed-upload signature builder"
```

## Task 13: Sign endpoint + PhotoUpload widget

**Files:**
- Create: `src/app/api/storybook/upload-sign/route.ts`
- Create: `src/components/storybook/PhotoUpload.tsx`

- [ ] **Step 1: Implement the sign endpoint**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env, hasCloudinary } from "@/lib/env";
import { buildSignature } from "@/lib/storybook/cloudinary";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasCloudinary()) return NextResponse.json({ error: "Uploads not configured" }, { status: 503 });
  const timestamp = Math.floor(new Date().getTime() / 1000);
  const folder = "storybook";
  const signature = buildSignature({ folder, timestamp }, env.cloudinarySecret);
  return NextResponse.json({
    cloudName: env.cloudinaryCloud,
    apiKey: env.cloudinaryKey,
    timestamp, folder, signature,
  });
}
```

- [ ] **Step 2: Implement `PhotoUpload`** — given `onUploaded(url, publicId)`: `<input type="file" accept="image/*">`, on change POST `/api/storybook/upload-sign`, then `FormData` POST to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload` with `file, api_key, timestamp, folder, signature`, read `secure_url` + `public_id`, call back. On 503, surface "Image uploads aren't set up yet." The editor's empty photo/ticket slot renders this widget; on success it `updateElement(pageId, elId, { props: { ...props, url, publicId } })`.

- [ ] **Step 3: Wire** `PhotoUpload` into `ElementView`'s empty-slot branch (only in editor mode — pass an `editable`/`onUploaded` prop).

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS. With real Cloudinary keys in `.env`, manually upload a photo into a slot and confirm it renders + persists.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/storybook/upload-sign/route.ts src/components/storybook/PhotoUpload.tsx src/components/storybook/ElementView.tsx
git commit -m "Add Cloudinary sign endpoint and slot photo/ticket upload"
```

---

# Phase 5 — PDF export

## Task 14: HTML serializer

**Files:**
- Create: `src/lib/storybook/serialize.ts`
- Test: `src/lib/storybook/serialize.test.ts`

Pure function `bookToHtml(book) → string`: a full HTML doc, one `<section class="page">` per page with `page-break-after: always`, each element an absolutely-positioned div sized in percent, photos as `<img src>`, text escaped. Page pixel size from `SIZE_DIMS`. Theme fonts/colors inlined via `getTheme(book.theme)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { bookToHtml } from "./serialize";

const book = {
  id: "b1", userId: "u1", title: "Goa", theme: "film-polaroid", sizePreset: "square",
  pages: [
    { id: "p1", bg: "#fff", elements: [
      { id: "e1", type: "photo", x: 0, y: 0, w: 50, h: 50, rotation: 0, z: 1, props: { url: "https://x/a.jpg", fit: "cover" } },
      { id: "e2", type: "text", x: 10, y: 60, w: 80, h: 20, rotation: 0, z: 2, props: { text: "Hi <b>", size: 20 } },
    ] },
    { id: "p2", bg: "#eee", elements: [] },
  ],
  status: "draft", createdAt: "", updatedAt: "",
} as any;

describe("bookToHtml", () => {
  const html = bookToHtml(book);
  it("emits one page section per page", () => {
    expect(html.match(/class="page"/g)?.length).toBe(2);
  });
  it("includes page-break between pages", () => {
    expect(html).toContain("page-break-after");
  });
  it("includes the photo url", () => {
    expect(html).toContain("https://x/a.jpg");
  });
  it("escapes text content", () => {
    expect(html).toContain("Hi &lt;b&gt;");
    expect(html).not.toContain("Hi <b>");
  });
  it("positions elements in percent", () => {
    expect(html).toMatch(/left:\s?0%/);
    expect(html).toMatch(/width:\s?50%/);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/storybook/serialize.test.ts`
Expected: FAIL — cannot find module `./serialize`.

- [ ] **Step 3: Implement**

```ts
import type { Storybook, StoryElement } from "./types";
import { SIZE_DIMS } from "./types";
import { getTheme } from "./templates/themes";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function elHtml(e: StoryElement): string {
  const box = `position:absolute;left:${e.x}%;top:${e.y}%;width:${e.w}%;height:${e.h}%;transform:rotate(${e.rotation}deg);z-index:${e.z};`;
  const p = e.props as Record<string, any>;
  if (e.type === "photo" || e.type === "ticket") {
    if (!p.url) return `<div style="${box}border:2px dashed #bbb"></div>`;
    const fit = p.fit === "contain" ? "contain" : "cover";
    return `<div style="${box}overflow:hidden"><img src="${esc(String(p.url))}" style="width:100%;height:100%;object-fit:${fit}"/></div>`;
  }
  if (e.type === "text") {
    const style = `${box}font-size:${p.size ?? 16}px;color:${esc(String(p.color ?? "#1a1a1a"))};text-align:${p.align ?? "left"};`;
    return `<div style="${style}">${esc(String(p.text ?? ""))}</div>`;
  }
  return `<div style="${box}background:${esc(String(p.color ?? "#ffcc00"))}"></div>`;
}

export function bookToHtml(book: Storybook): string {
  const dims = SIZE_DIMS[book.sizePreset];
  const theme = getTheme(book.theme);
  const pages = book.pages
    .map(
      (pg) =>
        `<section class="page" style="position:relative;width:${dims.w}px;height:${dims.h}px;background:${pg.bg};page-break-after:always;overflow:hidden;font-family:${theme.fonts.body}">` +
        pg.elements.map(elHtml).join("") +
        `</section>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}@page{size:${dims.w}px ${dims.h}px;margin:0}</style></head><body>${pages}</body></html>`;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run src/lib/storybook/serialize.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storybook/serialize.ts src/lib/storybook/serialize.test.ts
git commit -m "Add storybook HTML serializer for PDF"
```

## Task 15: Playwright PDF launcher + route

**Files:**
- Create: `src/lib/storybook/pdf.ts`
- Create: `src/app/api/storybook/[id]/pdf/route.ts`

`pdf.ts` mirrors `scrape.ts`: dynamic `import("playwright")`, minimal structural types, fail-safe `null` on error. Integration-only (no unit test).

- [ ] **Step 1: Implement `pdf.ts`**

```ts
import { SIZE_DIMS, type SizePreset } from "./types";

interface MinimalPage {
  setContent(html: string, opts: { waitUntil: string }): Promise<void>;
  pdf(opts: { width: string; height: string; printBackground: boolean }): Promise<Buffer>;
}
interface MinimalBrowser {
  newPage(): Promise<MinimalPage>;
  close(): Promise<void>;
}

/** Render book HTML to a PDF buffer via headless Chromium. Null on any failure. */
export async function htmlToPdf(html: string, sizePreset: SizePreset): Promise<Buffer | null> {
  const dims = SIZE_DIMS[sizePreset];
  let browser: MinimalBrowser | null = null;
  try {
    const pw = (await import("playwright" as any)) as { chromium: { launch(o: unknown): Promise<MinimalBrowser> } }; // eslint-disable-line
    browser = await pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({ width: `${dims.w}px`, height: `${dims.h}px`, printBackground: true });
  } catch (err) {
    console.error("[storybook] pdf render failed:", err);
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
```

- [ ] **Step 2: Implement the PDF route**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { StorybookSchema } from "@/lib/storybook/types";
import { bookToHtml } from "@/lib/storybook/serialize";
import { htmlToPdf } from "@/lib/storybook/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.storybook.findUnique({ where: { id } });
  if (!row || row.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const book = StorybookSchema.parse({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  const pdf = await htmlToPdf(bookToHtml(book), book.sizePreset);
  if (!pdf) return NextResponse.json({ error: "Render failed" }, { status: 500 });
  return new NextResponse(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${book.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Wire "Download PDF"** in `EditorToolbar` → `window.location.href = \`/api/storybook/${book.id}/pdf\`` (after a `save()` so the latest pages render).

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Then `npm run dev`, open a book with a photo, click Download PDF, confirm a correct multi-page PDF downloads.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storybook/pdf.ts "src/app/api/storybook/[id]/pdf/route.ts" src/components/storybook/EditorToolbar.tsx
git commit -m "Add server-side PDF render via Playwright and download button"
```

---

# Phase 6 — Seed from trip

## Task 16: `snapshotToPages` seed builder

**Files:**
- Modify: `src/lib/storybook/seed.ts` (replace the Task 4 stub, keep `blankPages`)
- Test: `src/lib/storybook/seed.test.ts`

`snapshotToPages(snapshot, preset)` → cover page (destination + dates) + one spread per city/stop (a photo slot pre-filled with the place's `imageUrl` when present, plus the place name + notes text) + a companions page + a "things I brought" page + a ticket placeholder page. Pure; takes the trip snapshot shape from `src/lib/store/trip.ts` (`TripSnapshot`). Read that type first and use its real field names.

- [ ] **Step 1: Read** `src/lib/store/trip.ts` to confirm the `TripSnapshot`/`SelectedPlace` field names (e.g. `destination`, ordered places, each place's `name` and `imageUrl`).

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { snapshotToPages, blankPages } from "./seed";

const snap = {
  destination: "Goa",
  // shape mirrors TripSnapshot; adjust field names in Step 1 if they differ
  order: ["a", "b"],
  selected: [
    { id: "a", name: "Baga Beach", imageUrl: "https://x/baga.jpg", notes: "sunset" },
    { id: "b", name: "Fort Aguada", imageUrl: "https://x/fort.jpg", notes: "" },
  ],
} as any;

describe("snapshotToPages", () => {
  const pages = snapshotToPages(snap);
  it("starts with a cover mentioning the destination", () => {
    const coverText = JSON.stringify(pages[0].elements);
    expect(coverText).toContain("Goa");
  });
  it("creates a spread per selected place with its photo", () => {
    const all = JSON.stringify(pages);
    expect(all).toContain("https://x/baga.jpg");
    expect(all).toContain("Baga Beach");
    expect(all).toContain("Fort Aguada");
  });
  it("appends companions + souvenirs + ticket placeholder pages", () => {
    const text = JSON.stringify(pages);
    expect(text.toLowerCase()).toContain("ticket");
    expect(pages.length).toBeGreaterThanOrEqual(5);
  });
  it("blankPages returns a single empty page", () => {
    expect(blankPages()).toHaveLength(1);
    expect(blankPages()[0].elements).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npx vitest run src/lib/storybook/seed.test.ts`
Expected: FAIL — `snapshotToPages` not exported.

- [ ] **Step 4: Implement** `snapshotToPages` (use the real snapshot field names from Step 1). Build pages with the same `slot`/`txt` element helpers used in presets (inline small local versions). Pre-fill photo slots by setting `props.url` to the place `imageUrl`. Keep `blankPages` unchanged.

- [ ] **Step 5: Run test, verify it passes**

Run: `npx vitest run src/lib/storybook/seed.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Wire** into the create flow (Task 7): "Start from my trip" path uses `snapshotToPages(trip.snapshot)`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/storybook/seed.ts src/lib/storybook/seed.test.ts src/app/storybooks/new/page.tsx
git commit -m "Add seed-from-trip page builder and wire into create flow"
```

---

# Phase 7 — Order stub

## Task 17: Order endpoint + modal

**Files:**
- Create: `src/app/api/storybook/[id]/order/route.ts`
- Create: `src/components/storybook/OrderModal.tsx`

- [ ] **Step 1: Implement the order endpoint**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  options: z.object({ size: z.string(), qty: z.number().int().min(1).max(20) }),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const book = await prisma.storybook.findUnique({ where: { id } });
  if (!book || book.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await prisma.printOrder.create({
    data: { storybookId: id, userId, email: parsed.data.email, options: parsed.data.options },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement `OrderModal`** — a Radix dialog (`@radix-ui/react-dialog` is already a dep): size select, qty input, email field, a static price estimate, submit → POST order endpoint → success state "Physical printing is coming soon — you're on the list." Wire the toolbar "Order print" button to open it.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Manually submit an order, confirm a `PrintOrder` row appears in `npx prisma studio`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/storybook/[id]/order/route.ts" src/components/storybook/OrderModal.tsx src/components/storybook/EditorToolbar.tsx
git commit -m "Add print-order stub endpoint and order modal"
```

---

## Final verification

- [ ] `npm test` — all storybook unit tests green (types, store, templates, cloudinary, serialize, seed).
- [ ] `npm run typecheck && npm run lint` — clean.
- [ ] `npm run build` — succeeds.
- [ ] Manual end-to-end (`npm run dev`, signed in): create a book from a trip → it seeds pages with real place photos → edit (drag/resize/rotate/add text/upload a photo into a slot) → autosaves → Download PDF returns a correct multi-page PDF → Order print records an intent. Repeat once from "blank".
- [ ] Confirm graceful degradation: with no `CLOUDINARY_*` keys, uploads show the "not configured" notice and the rest still works.

## Deployment notes

- Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to Railway env.
- The PDF route reuses the already-bundled Chromium (`nixpacks.toml`, `serverExternalPackages`). No new infra.
- Run the new Prisma migration on deploy (existing migrate step).
- After merge, update the build-status memory (storybook feature shipped).
```

