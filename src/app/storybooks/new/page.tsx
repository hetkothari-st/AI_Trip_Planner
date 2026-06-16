"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  FileText,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CalendarDays,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/chrome/TopNav";
import { useTrips, type SavedTrip } from "@/lib/store/trips";
import { snapshotToPages } from "@/lib/storybook/seed";
import { listTemplates, applyTemplate, getTheme, type TemplatePreset } from "@/lib/storybook/templates";
import { PageCanvas } from "@/components/storybook/PageCanvas";
import { withSamplePhotos } from "@/lib/storybook/sample";
import { SIZE_DIMS } from "@/lib/storybook/types";

type Step = "source" | "template";

export default function NewStorybookPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { trips } = useTrips();
  const templates = useMemo(() => listTemplates(), []);

  const [step, setStep] = useState<Step>("source");
  // The trip the book is seeded from, or null for a blank book.
  const [source, setSource] = useState<SavedTrip | null>(null);
  const [title, setTitle] = useState("My Storybook");
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Move to the template step seeded from a trip (or blank when null). */
  function chooseSource(trip: SavedTrip | null) {
    setSource(trip);
    setTitle(
      trip ? trip.name || `${trip.destination} Storybook` : "My Storybook",
    );
    setStep("template");
  }

  async function create() {
    const preset = templates.find((t) => t.id === templateId);
    if (!preset || creating) return;

    setCreating(true);
    setError(null);

    const body = {
      title: title.trim() || "My Storybook",
      theme: preset.themeId,
      sizePreset: "square" as const,
      ...(source
        ? { tripId: source.id, pages: snapshotToPages(source.snapshot) }
        : { pages: applyTemplate(preset) }),
    };

    try {
      const res = await fetch("/api/storybooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setError("Couldn't create your storybook. Please try again.");
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/storybooks/${id}/edit`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:px-8">
        {/* page heading */}
        <div className="mb-10 border-b-4 border-primary pb-6">
          <span className="inline-block border-2 border-primary bg-tertiary px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white neo-shadow">
            {step === "source" ? "Step 1 of 2 · Source" : "Step 2 of 2 · Template"}
          </span>
          <h1 className="mt-4 text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter text-primary md:text-7xl">
            New Storybook
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium uppercase tracking-wide text-on-surface-variant">
            {step === "source"
              ? "Build it from a saved trip, or start with a blank book."
              : "Pick a template to lay out your pages."}
          </p>
        </div>

        {step === "source" ? (
          <div className="space-y-10">
            {/* Title */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Storybook"
                className="h-12 max-w-md rounded-none border-2 border-primary text-base font-bold uppercase"
              />
            </div>

            {/* Start blank */}
            <div>
              <h2 className="mb-5 flex items-center gap-3 text-xl font-bold uppercase tracking-tight text-primary">
                <span className="flex size-8 items-center justify-center border-2 border-primary bg-primary-container">
                  <FileText className="size-4" strokeWidth={2.5} />
                </span>
                Start Blank
              </h2>
              <button
                onClick={() => chooseSource(null)}
                className="group flex w-full max-w-md items-center gap-4 border-4 border-primary bg-surface-container-lowest p-5 text-left transition-all hover:neo-shadow"
              >
                <span className="flex size-12 shrink-0 items-center justify-center border-2 border-primary bg-accent text-primary">
                  <BookOpen className="size-6" strokeWidth={2} />
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-bold uppercase tracking-tight">Blank Storybook</span>
                  <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    A fresh book seeded from a template
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-primary" strokeWidth={3} />
              </button>
            </div>

            {/* Start from a trip */}
            <div>
              <h2 className="mb-5 flex items-center gap-3 text-xl font-bold uppercase tracking-tight text-primary">
                <span className="flex size-8 items-center justify-center border-2 border-primary bg-primary-container">
                  <Sparkles className="size-4" strokeWidth={2.5} />
                </span>
                Start From My Trip
              </h2>

              {!mounted ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-44 animate-pulse border-4 border-primary/20 bg-surface-container" />
                  ))}
                </div>
              ) : trips.length === 0 ? (
                <div className="border-4 border-dashed border-primary bg-surface-container-lowest py-12 text-center">
                  <MapPin className="mx-auto size-8 text-primary" strokeWidth={2.5} />
                  <p className="mx-auto mt-3 max-w-md text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                    No saved trips yet — start blank or plan a trip first.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {trips.map((t) => (
                    <TripCard key={t.id} trip={t} onPick={() => chooseSource(t)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setStep("source")}
                className="flex items-center gap-2 border-2 border-primary bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary-container"
              >
                <ArrowLeft className="size-4" strokeWidth={3} /> Back
              </button>
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                {source ? `From "${source.name}"` : "Blank book"} · {title.trim() || "My Storybook"}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  preset={t}
                  selected={t.id === templateId}
                  onSelect={() => setTemplateId(t.id)}
                />
              ))}
            </div>

            {error && (
              <p className="border-2 border-secondary bg-secondary/10 px-4 py-3 text-sm font-bold uppercase tracking-wide text-secondary">
                {error}
              </p>
            )}

            <div className="flex justify-end border-t-4 border-primary pt-6">
              <button
                onClick={create}
                disabled={!templateId || creating}
                className="flex items-center gap-2 border-4 border-primary bg-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? "Creating…" : "Create"} <ArrowRight className="size-4" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TripCard({ trip, onPick }: { trip: SavedTrip; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="group flex flex-col overflow-hidden border-4 border-primary bg-surface-container-lowest text-left transition-all hover:neo-shadow"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.coverImage ?? `https://picsum.photos/seed/${encodeURIComponent(trip.name)}/600/300`}
          alt={trip.name}
          className="h-36 w-full border-b-4 border-primary object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-bold uppercase tracking-tight">{trip.name}</h3>
        <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          {trip.region ? `${trip.region} · ` : ""}
          {trip.destination || "No destination yet"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide">
          <span className="flex items-center gap-1 border-2 border-primary px-2 py-0.5">
            <MapPin className="size-3" /> {trip.placeCount} {trip.placeCount === 1 ? "place" : "places"}
          </span>
          <span className="flex items-center gap-1 border-2 border-primary px-2 py-0.5">
            <CalendarDays className="size-3" /> {trip.totalDays} {trip.totalDays === 1 ? "day" : "days"}
          </span>
        </div>
        <span className="mt-4 flex items-center justify-center gap-2 border-2 border-primary bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors group-hover:bg-tertiary">
          Use This Trip <ArrowRight className="size-4" strokeWidth={3} />
        </span>
      </div>
    </button>
  );
}

function TemplateCard({
  preset,
  selected,
  onSelect,
}: {
  preset: TemplatePreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = getTheme(preset.themeId);
  // A real scaled render of the template's first page, with sample photos dropped
  // into the empty slots, so each card previews its own layout + theme colors.
  const PREVIEW_PX = 150;
  const previewPage = useMemo(
    () => withSamplePhotos(preset.pages[0], preset.id),
    [preset],
  );
  const scale = PREVIEW_PX / SIZE_DIMS.square.w;
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex flex-col overflow-hidden border-4 border-primary bg-surface-container-lowest text-left transition-all",
        selected ? "neo-shadow ring-4 ring-primary ring-offset-2 ring-offset-background" : "hover:neo-shadow",
      )}
    >
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden border-b-4 border-primary p-3"
        style={{ backgroundColor: theme.palette.bg }}
      >
        <div
          className="border-2 border-primary/40 shadow-md"
          style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
        >
          <PageCanvas page={previewPage} theme={theme} sizePreset="square" scale={scale} />
        </div>
        {selected && (
          <span className="absolute right-2 top-2 flex size-6 items-center justify-center border-2 border-primary bg-primary text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-sm font-bold uppercase tracking-tight">{preset.name}</h3>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          {preset.category}
        </p>
      </div>
    </button>
  );
}
