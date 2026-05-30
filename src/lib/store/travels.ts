"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VisitedPlace } from "@/lib/travels/types";

export type NewVisited = Omit<VisitedPlace, "id" | "createdAt">;

interface TravelsState {
  clientId: string;
  entries: VisitedPlace[];
  hydrated: boolean;

  addVisited: (v: NewVisited) => VisitedPlace;
  /** Add many at once (e.g. converting a planned trip), skipping duplicates by name+destination. */
  addManyVisited: (vs: NewVisited[]) => void;
  updateVisited: (id: string, patch: Partial<VisitedPlace>) => void;
  removeVisited: (id: string) => void;
  /** Pull the DB copy for this device and merge it in (DB + local union by id). */
  hydrateFromServer: () => Promise<void>;
}

function uid(): string {
  // crypto.randomUUID is available in modern browsers; fall back for older runtimes.
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

// Fire-and-forget DB sync. Failures are ignored — the local store is the source of truth.
function syncPut(clientId: string, entry: VisitedPlace): void {
  fetch("/api/travels", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...entry, clientId }),
  }).catch(() => {});
}

function syncDelete(clientId: string, id: string): void {
  fetch(`/api/travels?clientId=${encodeURIComponent(clientId)}&id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

/**
 * Fill in a banner photo and map coordinates for an entry that's missing them (typically a
 * manually-added one). Best-effort: patches the entry via `patch` when data comes back.
 */
function enrich(entry: VisitedPlace, patch: (id: string, p: Partial<VisitedPlace>) => void): void {
  if (entry.photoUrl && entry.lat != null && entry.lng != null) return;
  const q = `name=${encodeURIComponent(entry.name)}&destination=${encodeURIComponent(entry.destination)}`;
  fetch(`/api/enrich?${q}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { photoUrl?: string; lat?: number; lng?: number } | null) => {
      if (!data) return;
      const p: Partial<VisitedPlace> = {};
      if (!entry.photoUrl && data.photoUrl) p.photoUrl = data.photoUrl;
      if (entry.lat == null && data.lat != null) p.lat = data.lat;
      if (entry.lng == null && data.lng != null) p.lng = data.lng;
      if (Object.keys(p).length) patch(entry.id, p);
    })
    .catch(() => {});
}

export const useTravels = create<TravelsState>()(
  persist(
    (set, get) => ({
      clientId: uid(),
      entries: [],
      hydrated: false,

      addVisited: (v) => {
        const entry: VisitedPlace = { ...v, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ entries: [entry, ...s.entries] }));
        syncPut(get().clientId, entry);
        enrich(entry, get().updateVisited);
        return entry;
      },

      addManyVisited: (vs) =>
        set((s) => {
          const clientId = get().clientId;
          const existing = new Set(
            s.entries.map((e) => `${e.name.toLowerCase()}|${e.destination.toLowerCase()}`),
          );
          const fresh: VisitedPlace[] = [];
          for (const v of vs) {
            const key = `${v.name.toLowerCase()}|${v.destination.toLowerCase()}`;
            if (existing.has(key)) continue;
            existing.add(key);
            const entry: VisitedPlace = { ...v, id: uid(), createdAt: new Date().toISOString() };
            fresh.push(entry);
            syncPut(clientId, entry);
            enrich(entry, get().updateVisited);
          }
          return { entries: [...fresh, ...s.entries] };
        }),

      updateVisited: (id, patch) =>
        set((s) => {
          const entries = s.entries.map((e) => (e.id === id ? { ...e, ...patch, id } : e));
          const updated = entries.find((e) => e.id === id);
          if (updated) syncPut(get().clientId, updated);
          return { entries };
        }),

      removeVisited: (id) => {
        syncDelete(get().clientId, id);
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },

      hydrateFromServer: async () => {
        const { clientId, entries } = get();
        try {
          const res = await fetch(`/api/travels?clientId=${encodeURIComponent(clientId)}`);
          if (!res.ok) throw new Error();
          const { entries: remote } = (await res.json()) as { entries: VisitedPlace[] };
          const byId = new Map(entries.map((e) => [e.id, e]));
          for (const r of remote) if (!byId.has(r.id)) byId.set(r.id, r);
          // Any local entry the server doesn't have yet → push it up.
          const remoteIds = new Set(remote.map((r) => r.id));
          for (const e of entries) if (!remoteIds.has(e.id)) syncPut(clientId, e);
          const merged = [...byId.values()].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          );
          set({ entries: merged, hydrated: true });
        } catch {
          set({ hydrated: true });
        }
      },
    }),
    { name: "voyager-travels" },
  ),
);
