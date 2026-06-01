"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Compass,
  Plus,
  MapPin,
  Star,
  Trash2,
  Pencil,
  Users,
  CalendarDays,
  Wallet,
  Map as MapIcon,
} from "lucide-react";
import { VisitedForm } from "@/components/travels/VisitedForm";
import { MapPanel } from "@/components/map/MapPanel";
import { TopNav } from "@/components/chrome/TopNav";
import { useTravels } from "@/lib/store/travels";
import { formatINR } from "@/lib/cost";
import { tripDays, travelStats, type VisitedPlace } from "@/lib/travels/types";

export default function TravelsPage() {
  const [mounted, setMounted] = useState(false);
  const { entries, clientId, addVisited, updateVisited, removeVisited, hydrateFromServer } =
    useTravels();
  const { status } = useSession();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    hydrateFromServer();
  }, [hydrateFromServer]);

  // On sign-in, merge this device's anonymous entries into the account, then re-pull.
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/travels/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId }),
    })
      .catch(() => {})
      .finally(() => hydrateFromServer());
  }, [status, clientId, hydrateFromServer]);

  const stats = useMemo(() => travelStats(entries), [entries]);
  const mapped = useMemo(
    () =>
      entries
        .filter((e) => e.lat != null && e.lng != null)
        .map((e) => ({ id: e.id, name: e.name, lat: e.lat!, lng: e.lng! })),
    [entries],
  );

  // Group entries by destination for a clean, scannable log.
  const grouped = useMemo(() => {
    const map = new Map<string, VisitedPlace[]>();
    for (const e of entries) {
      const list = map.get(e.destination);
      if (list) list.push(e);
      else map.set(e.destination, [e]);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:px-8">
        {/* page heading */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-4 border-primary pb-6">
          <div>
            <span className="inline-block border-2 border-primary bg-secondary px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white neo-shadow">
              Memory Log
            </span>
            <h1 className="mt-4 text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter text-primary md:text-7xl">
              Travel History
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium uppercase tracking-wide text-on-surface-variant">
              Places already explored — budgets, activities and memories. We use it to tailor future trips.
            </p>
          </div>
          <button
            onClick={() => {
              setAdding((v) => !v);
              setEditingId(null);
            }}
            className="flex items-center gap-2 border-4 border-primary bg-primary-container px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary neo-shadow-hover"
          >
            <Plus className="size-4" strokeWidth={3} /> Log A Place
          </button>
        </div>

        {/* stats */}
        {mounted && entries.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon={MapPin} label="Places" value={String(stats.places)} tone="surface" />
            <Stat icon={Compass} label="Regions" value={String(stats.regions)} tone="yellow" />
            <Stat icon={CalendarDays} label="Days Travelled" value={String(stats.totalDays)} tone="blue" />
            <Stat icon={Wallet} label="Total Spent" value={formatINR(stats.totalBudget)} tone="red" />
          </div>
        )}

        {/* map of everywhere visited */}
        {mounted && mapped.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold uppercase tracking-tight text-primary">
              <span className="flex size-8 items-center justify-center border-2 border-primary bg-primary-container">
                <MapIcon className="size-4" strokeWidth={2.5} />
              </span>
              Where You&apos;ve Been
            </h2>
            <div className="h-[360px] overflow-hidden border-4 border-primary neo-shadow">
              <MapPanel stops={mapped} route={null} />
            </div>
          </section>
        )}

        {/* add form */}
        {adding && (
          <div className="mb-10 border-4 border-primary bg-surface-container-lowest p-1 neo-shadow">
            <VisitedForm
              onSubmit={(data) => {
                addVisited(data);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {!mounted ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse border-4 border-primary/20 bg-surface-container" />
            <div className="h-28 animate-pulse border-4 border-primary/20 bg-surface-container" />
          </div>
        ) : entries.length === 0 && !adding ? (
          <div className="border-4 border-dashed border-primary bg-surface-container-lowest py-20 text-center">
            <MapPin className="mx-auto size-10 text-primary" strokeWidth={2.5} />
            <p className="mt-4 text-2xl font-bold uppercase tracking-tight">No Places Logged Yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium uppercase tracking-wide text-on-surface-variant">
              Add somewhere you&apos;ve been, or finish planning a trip and mark it visited.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-6 inline-flex items-center gap-2 border-4 border-primary bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover"
            >
              <Plus className="size-4" strokeWidth={3} /> Log Your First Place
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([destination, list]) => (
              <section key={destination}>
                <h2 className="mb-4 flex items-center gap-3 text-xl font-bold uppercase tracking-tight text-primary">
                  <span className="flex size-8 items-center justify-center border-2 border-primary bg-primary-container">
                    <MapPin className="size-4" strokeWidth={2.5} />
                  </span>
                  {destination}
                  <span className="border-2 border-primary bg-primary px-2 py-0.5 text-xs font-bold text-white">
                    {list.length}
                  </span>
                </h2>
                <div className="grid gap-4">
                  {list.map((e) =>
                    editingId === e.id ? (
                      <div key={e.id} className="border-4 border-primary bg-surface-container-lowest p-1 neo-shadow">
                        <VisitedForm
                          initial={e}
                          submitLabel="Save changes"
                          onSubmit={(data) => {
                            updateVisited(e.id, data);
                            setEditingId(null);
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <EntryCard
                        key={e.id}
                        entry={e}
                        onEdit={() => {
                          setEditingId(e.id);
                          setAdding(false);
                        }}
                        onDelete={() => removeVisited(e.id)}
                      />
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  tone: "surface" | "yellow" | "blue" | "red";
}) {
  const toneClass =
    tone === "yellow"
      ? "bg-primary-container text-primary"
      : tone === "blue"
        ? "bg-tertiary text-white"
        : tone === "red"
          ? "bg-secondary text-white"
          : "bg-surface-container-lowest text-primary";
  return (
    <div className={`border-4 border-primary p-4 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-80">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-1 text-3xl font-extrabold uppercase tracking-tighter">{value}</p>
    </div>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: VisitedPlace;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const days = tripDays(entry.startDate, entry.endDate);
  return (
    <div className="group flex flex-wrap items-start gap-4 border-4 border-primary bg-surface-container-lowest p-4 transition-all hover:neo-shadow">
      {entry.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.photoUrl}
          alt={entry.name}
          className="h-24 w-32 shrink-0 border-2 border-primary object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold uppercase tracking-tight">{entry.name}</h3>
          {entry.regionName && (
            <span className="border-2 border-primary bg-tertiary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {entry.regionName}
            </span>
          )}
          {entry.rating ? (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: entry.rating }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-primary-fixed-dim text-primary-fixed-dim" />
              ))}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide">
          {(entry.startDate || entry.endDate) && (
            <span className="flex items-center gap-1 border-2 border-primary px-2 py-0.5">
              <CalendarDays className="size-3" />
              {entry.startDate ?? "?"}
              {entry.endDate ? ` → ${entry.endDate}` : ""}
              {days ? ` · ${days}d` : ""}
            </span>
          )}
          {entry.budget != null && (
            <span className="flex items-center gap-1 border-2 border-primary px-2 py-0.5">
              <Wallet className="size-3" /> {formatINR(entry.budget)}
            </span>
          )}
          {entry.companions != null && (
            <span className="flex items-center gap-1 border-2 border-primary px-2 py-0.5">
              <Users className="size-3" /> {entry.companions}
            </span>
          )}
        </div>

        {entry.activities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.activities.map((a) => (
              <span
                key={a}
                className="border border-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {entry.notes && (
          <p className="mt-2 text-sm font-medium text-on-surface-variant">{entry.notes}</p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          onClick={onEdit}
          aria-label="Edit"
          className="border-2 border-primary bg-surface p-2 transition-colors hover:bg-primary-container"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="border-2 border-primary bg-surface p-2 transition-colors hover:bg-secondary hover:text-white"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
