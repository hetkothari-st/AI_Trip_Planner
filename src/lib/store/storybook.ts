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
