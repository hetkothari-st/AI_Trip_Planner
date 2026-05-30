"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VisitedForm } from "@/components/travels/VisitedForm";
import { useTravels } from "@/lib/store/travels";
import { formatINR } from "@/lib/cost";
import { tripDays, travelStats, type VisitedPlace } from "@/lib/travels/types";

export default function TravelsPage() {
  const [mounted, setMounted] = useState(false);
  const { entries, addVisited, updateVisited, removeVisited, hydrateFromServer } = useTravels();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    hydrateFromServer();
  }, [hydrateFromServer]);

  const stats = useMemo(() => travelStats(entries), [entries]);

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
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="font-serif text-lg font-semibold">Voyager</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/plan">
              <MapIcon className="size-4" /> Plan a trip
            </Link>
          </Button>
        </div>
      </header>

      <main className="container py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight">My travels</h1>
            <p className="mt-1 text-muted-foreground">
              Your bucket list of places already explored — budgets, activities and memories.
              We use it to tailor future trips.
            </p>
          </div>
          <Button
            onClick={() => {
              setAdding((v) => !v);
              setEditingId(null);
            }}
          >
            <Plus className="size-4" /> Log a place
          </Button>
        </div>

        {/* stats */}
        {mounted && entries.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={MapPin} label="Places" value={String(stats.places)} />
            <Stat icon={Compass} label="Regions" value={String(stats.regions)} />
            <Stat icon={CalendarDays} label="Days travelled" value={String(stats.totalDays)} />
            <Stat icon={Wallet} label="Total spent" value={formatINR(stats.totalBudget)} />
          </div>
        )}

        {/* add form */}
        {adding && (
          <div className="mb-8">
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
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : entries.length === 0 && !adding ? (
          <div className="rounded-xl border border-dashed py-16 text-center">
            <MapPin className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-medium">No places logged yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add somewhere you&apos;ve been, or finish planning a trip and mark it visited.
            </p>
            <Button className="mt-4" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Log your first place
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([destination, list]) => (
              <section key={destination}>
                <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-semibold">
                  <MapPin className="size-4 text-primary" /> {destination}
                  <Badge variant="muted">{list.length}</Badge>
                </h2>
                <div className="grid gap-3">
                  {list.map((e) =>
                    editingId === e.id ? (
                      <VisitedForm
                        key={e.id}
                        initial={e}
                        submitLabel="Save changes"
                        onSubmit={(data) => {
                          updateVisited(e.id, data);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
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
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-1 font-serif text-2xl font-semibold">{value}</p>
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
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{entry.name}</h3>
          {entry.regionName && <Badge variant="secondary">{entry.regionName}</Badge>}
          {entry.rating ? (
            <span className="flex items-center gap-0.5 text-sm">
              {Array.from({ length: entry.rating }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-accent text-accent" />
              ))}
            </span>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {(entry.startDate || entry.endDate) && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {entry.startDate ?? "?"}
              {entry.endDate ? ` → ${entry.endDate}` : ""}
              {days ? ` · ${days}d` : ""}
            </span>
          )}
          {entry.budget != null && (
            <span className="flex items-center gap-1">
              <Wallet className="size-3.5" /> {formatINR(entry.budget)}
            </span>
          )}
          {entry.companions != null && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {entry.companions}
            </span>
          )}
        </div>

        {entry.activities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.activities.map((a) => (
              <Badge key={a} variant="muted">
                {a}
              </Badge>
            ))}
          </div>
        )}

        {entry.notes && <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>}
      </div>

      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
