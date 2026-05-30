"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Map as MapIcon,
  MapPin,
  CalendarDays,
  Plus,
  Trash2,
  Pencil,
  Check,
  Copy,
  ArrowRight,
  Sparkles,
  Luggage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { AuthButton } from "@/components/auth/AuthButton";
import { useTrip, snapshotOf, tripHasContent } from "@/lib/store/trip";
import { useTrips, autoName, type SavedTrip } from "@/lib/store/trips";
import { loadTrip, startNewTrip, discardTrip, saveActiveTrip } from "@/lib/store/tripManager";

export default function TripsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const { trips, activeId, rename } = useTrips();
  const live = useTrip();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  // id of the trip pending a discard confirmation; "__ongoing__" for the live unsaved card
  const [pendingDiscard, setPendingDiscard] = useState<string | null>(null);

  const liveSnap = useMemo(() => snapshotOf(live), [live]);
  const ongoingUnsaved = tripHasContent(liveSnap) && activeId == null;

  const drafts = trips.filter((t) => t.status === "draft");
  const saved = trips.filter((t) => t.status === "saved");

  function go(id: string) {
    if (id !== activeId) loadTrip(id);
    router.push("/plan");
  }

  function confirmDiscard() {
    if (pendingDiscard === "__ongoing__") startNewTrip();
    else if (pendingDiscard) discardTrip(pendingDiscard);
    setPendingDiscard(null);
  }

  const pendingName =
    pendingDiscard && pendingDiscard !== "__ongoing__"
      ? trips.find((t) => t.id === pendingDiscard)?.name
      : "this unsaved trip";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="font-serif text-lg font-semibold">Voyager</span>
          </Link>
          <div className="flex items-center gap-1">
            <AuthButton />
            <Button asChild variant="ghost" size="sm">
              <Link href="/travels">
                <MapPin className="size-4" /> My travels
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/plan">
                <MapIcon className="size-4" /> Plan a trip
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight">My trips</h1>
            <p className="mt-1 text-muted-foreground">
              Pick up where you left off, revisit a saved plan, or start something new.
            </p>
          </div>
          <Button
            onClick={() => {
              startNewTrip({ save: true });
              router.push("/plan");
            }}
          >
            <Plus className="size-4" /> Start new trip
          </Button>
        </div>

        {!mounted ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : !ongoingUnsaved && trips.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center">
            <Luggage className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-medium">No trips yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start planning and save it as a draft — it&apos;ll show up here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/plan">
                <Sparkles className="size-4" /> Plan your first trip
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Continue planning — the live, not-yet-saved wizard */}
            {ongoingUnsaved && (
              <Section title="Continue planning" icon={MapIcon}>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <OngoingCard
                    snap={liveSnap}
                    onContinue={() => router.push("/plan")}
                    onSave={() => saveActiveTrip("draft")}
                    onDiscard={() => setPendingDiscard("__ongoing__")}
                  />
                </div>
              </Section>
            )}

            {drafts.length > 0 && (
              <Section title="Drafts" icon={Pencil} count={drafts.length}>
                <TripGrid
                  trips={drafts}
                  activeId={activeId}
                  editingId={editingId}
                  draftName={draftName}
                  onGo={go}
                  onStartRename={(t) => {
                    setEditingId(t.id);
                    setDraftName(t.name);
                  }}
                  onChangeName={setDraftName}
                  onCommitName={(id) => {
                    rename(id, draftName);
                    setEditingId(null);
                  }}
                  onDiscard={(id) => setPendingDiscard(id)}
                />
              </Section>
            )}

            {saved.length > 0 && (
              <Section title="Saved trips" icon={Check} count={saved.length}>
                <TripGrid
                  trips={saved}
                  activeId={activeId}
                  editingId={editingId}
                  draftName={draftName}
                  onGo={go}
                  onStartRename={(t) => {
                    setEditingId(t.id);
                    setDraftName(t.name);
                  }}
                  onChangeName={setDraftName}
                  onCommitName={(id) => {
                    rename(id, draftName);
                    setEditingId(null);
                  }}
                  onDiscard={(id) => setPendingDiscard(id)}
                />
              </Section>
            )}
          </div>
        )}
      </main>

      <AlertDialog
        open={pendingDiscard != null}
        onOpenChange={(o) => !o && setPendingDiscard(null)}
        title="Discard this trip?"
        description={
          <>
            <span className="font-medium text-foreground">{pendingName}</span> will be permanently
            removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Discard"
        destructive
        onConfirm={confirmDiscard}
      />
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof MapPin;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold">
        <Icon className="size-4 text-primary" /> {title}
        {count != null && <Badge variant="muted">{count}</Badge>}
      </h2>
      {children}
    </section>
  );
}

function CoverImage({ trip }: { trip: Pick<SavedTrip, "coverImage" | "name"> }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trip.coverImage ?? `https://picsum.photos/seed/${encodeURIComponent(trip.name)}/600/300`}
      alt={trip.name}
      className="h-32 w-full object-cover"
    />
  );
}

function Meta({
  destination,
  region,
  placeCount,
  totalDays,
}: {
  destination: string;
  region: string | null;
  placeCount: number;
  totalDays: number;
}) {
  return (
    <>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">
        {region ? `${region} · ` : ""}
        {destination || "No destination yet"}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" /> {placeCount} {placeCount === 1 ? "place" : "places"}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="size-3.5" /> {totalDays} {totalDays === 1 ? "day" : "days"}
        </span>
      </div>
    </>
  );
}

function OngoingCard({
  snap,
  onContinue,
  onSave,
  onDiscard,
}: {
  snap: ReturnType<typeof snapshotOf>;
  onContinue: () => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const placeCount = Object.keys(snap.selected).length;
  const totalDays = Object.values(snap.selected).reduce((n, p) => n + p.days, 0);
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm ring-2 ring-primary">
      <div className="relative">
        <CoverImage trip={{ coverImage: snap.selected[snap.order[0]]?.imageUrl, name: autoName(snap) }} />
        <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">In progress</Badge>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-serif text-lg font-semibold">{autoName(snap)}</h3>
        <Meta
          destination={snap.destination}
          region={snap.region?.name ?? null}
          placeCount={placeCount}
          totalDays={totalDays}
        />
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" className="flex-1" onClick={onContinue}>
            Continue <ArrowRight className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSave();
              setSaved(true);
            }}
          >
            {saved ? <Check className="size-4" /> : null} {saved ? "Saved" : "Save draft"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onDiscard} aria-label="Discard">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TripGrid({
  trips,
  activeId,
  editingId,
  draftName,
  onGo,
  onStartRename,
  onChangeName,
  onCommitName,
  onDiscard,
}: {
  trips: SavedTrip[];
  activeId: string | null;
  editingId: string | null;
  draftName: string;
  onGo: (id: string) => void;
  onStartRename: (t: SavedTrip) => void;
  onChangeName: (v: string) => void;
  onCommitName: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const { duplicate } = useTrips();
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((t) => {
        const isActive = t.id === activeId;
        return (
          <div
            key={t.id}
            className={`flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md ${
              isActive ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="relative">
              <CoverImage trip={t} />
              {isActive && (
                <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
                  Active
                </Badge>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              {editingId === t.id ? (
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(e) => onChangeName(e.target.value)}
                  onBlur={() => onCommitName(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitName(t.id);
                  }}
                  className="h-8"
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-serif text-lg font-semibold">{t.name}</h3>
                  <button
                    onClick={() => onStartRename(t)}
                    className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Rename"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              )}
              <Meta
                destination={t.destination}
                region={t.region}
                placeCount={t.placeCount}
                totalDays={t.totalDays}
              />
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" className="flex-1" onClick={() => onGo(t.id)}>
                  {isActive ? "Continue" : "Resume"} <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => duplicate(t.id)}
                  aria-label="Duplicate"
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDiscard(t.id)}
                  aria-label="Discard"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
