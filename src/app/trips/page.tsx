"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { TopNav } from "@/components/chrome/TopNav";
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
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:px-8">
        {/* page heading */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-4 border-primary pb-6">
          <div>
            <span className="inline-block border-2 border-primary bg-tertiary px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white neo-shadow">
              Trip Archive
            </span>
            <h1 className="mt-4 text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter text-primary md:text-7xl">
              My Trips
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium uppercase tracking-wide text-on-surface-variant">
              Pick up where you left off, revisit a saved plan, or start something new.
            </p>
          </div>
          <button
            onClick={() => {
              startNewTrip({ save: true });
              router.push("/plan");
            }}
            className="flex items-center gap-2 border-4 border-primary bg-primary-container px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary neo-shadow-hover"
          >
            <Plus className="size-4" strokeWidth={3} /> Start New Trip
          </button>
        </div>

        {!mounted ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse border-4 border-primary/20 bg-surface-container" />
            ))}
          </div>
        ) : !ongoingUnsaved && trips.length === 0 ? (
          <div className="border-4 border-dashed border-primary bg-surface-container-lowest py-20 text-center">
            <Luggage className="mx-auto size-10 text-primary" strokeWidth={2.5} />
            <p className="mt-4 text-2xl font-bold uppercase tracking-tight">No Trips Yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium uppercase tracking-wide text-on-surface-variant">
              Start planning and save it as a draft — it&apos;ll show up here.
            </p>
            <Link
              href="/plan"
              className="mt-6 inline-flex items-center gap-2 border-4 border-primary bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover"
            >
              <Sparkles className="size-4" strokeWidth={3} /> Plan Your First Trip
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Continue planning — the live, not-yet-saved wizard */}
            {ongoingUnsaved && (
              <Section title="Continue Planning" icon={MapIcon}>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <Section title="Saved Trips" icon={Check} count={saved.length}>
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
      <h2 className="mb-5 flex items-center gap-3 text-xl font-bold uppercase tracking-tight text-primary">
        <span className="flex size-8 items-center justify-center border-2 border-primary bg-primary-container">
          <Icon className="size-4" strokeWidth={2.5} />
        </span>
        {title}
        {count != null && (
          <span className="border-2 border-primary bg-primary px-2 py-0.5 text-xs font-bold text-white">
            {count}
          </span>
        )}
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
      className="h-36 w-full border-b-4 border-primary object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
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
      <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
        {region ? `${region} · ` : ""}
        {destination || "No destination yet"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide">
        <span className="flex items-center gap-1 border-2 border-primary px-2 py-0.5">
          <MapPin className="size-3" /> {placeCount} {placeCount === 1 ? "place" : "places"}
        </span>
        <span className="flex items-center gap-1 border-2 border-primary px-2 py-0.5">
          <CalendarDays className="size-3" /> {totalDays} {totalDays === 1 ? "day" : "days"}
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
    <div className="group flex flex-col overflow-hidden border-4 border-primary bg-surface-container-lowest neo-shadow">
      <div className="relative">
        <CoverImage trip={{ coverImage: snap.selected[snap.order[0]]?.imageUrl, name: autoName(snap) }} />
        <span className="absolute left-3 top-3 border-2 border-primary bg-tertiary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          In Progress
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-bold uppercase tracking-tight">{autoName(snap)}</h3>
        <Meta
          destination={snap.destination}
          region={snap.region?.name ?? null}
          placeCount={placeCount}
          totalDays={totalDays}
        />
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onContinue}
            className="flex flex-1 items-center justify-center gap-2 border-2 border-primary bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-tertiary"
          >
            Continue <ArrowRight className="size-4" strokeWidth={3} />
          </button>
          <button
            onClick={() => {
              onSave();
              setSaved(true);
            }}
            className="flex items-center gap-1 border-2 border-primary bg-surface px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-primary-container"
          >
            {saved ? <Check className="size-4" strokeWidth={3} /> : null} {saved ? "Saved" : "Save"}
          </button>
          <button
            onClick={onDiscard}
            aria-label="Discard"
            className="border-2 border-primary bg-surface p-2.5 transition-colors hover:bg-secondary hover:text-white"
          >
            <Trash2 className="size-4" />
          </button>
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((t) => {
        const isActive = t.id === activeId;
        return (
          <div
            key={t.id}
            className={cn(
              "group flex flex-col overflow-hidden border-4 border-primary bg-surface-container-lowest transition-all",
              isActive ? "neo-shadow" : "hover:neo-shadow",
            )}
          >
            <div className="relative">
              <CoverImage trip={t} />
              {isActive && (
                <span className="absolute left-3 top-3 border-2 border-primary bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Active
                </span>
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
                  className="h-9 rounded-none border-2 border-primary font-bold uppercase"
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-lg font-bold uppercase tracking-tight">{t.name}</h3>
                  <button
                    onClick={() => onStartRename(t)}
                    className="mt-1 shrink-0 text-on-surface-variant hover:text-primary"
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
                <button
                  onClick={() => onGo(t.id)}
                  className="flex flex-1 items-center justify-center gap-2 border-2 border-primary bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-tertiary"
                >
                  {isActive ? "Continue" : "Resume"} <ArrowRight className="size-4" strokeWidth={3} />
                </button>
                <button
                  onClick={() => duplicate(t.id)}
                  aria-label="Duplicate"
                  className="border-2 border-primary bg-surface p-2.5 transition-colors hover:bg-primary-container"
                >
                  <Copy className="size-4" />
                </button>
                <button
                  onClick={() => onDiscard(t.id)}
                  aria-label="Discard"
                  className="border-2 border-primary bg-surface p-2.5 transition-colors hover:bg-secondary hover:text-white"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
