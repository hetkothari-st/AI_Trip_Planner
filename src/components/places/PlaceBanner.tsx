"use client";

import {
  Check,
  Plus,
  Minus,
  Star,
  Youtube,
  Globe,
  MessageSquare,
  BadgeCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { seasonBadge } from "@/lib/season";
import type { RankedPlace, Source } from "@/lib/ai/schemas";

const SOURCE_ICON: Record<Source["kind"], typeof Globe> = {
  web: Globe,
  youtube: Youtube,
  reddit: MessageSquare,
  x: MessageSquare,
  ai: Star,
};

/** Deterministic pseudo "match rate" so each ranked card gets a stable badge. */
function matchRate(id: string, rank: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return Math.max(78, 99 - (rank - 1) * 3 - (h % 3));
}

export function PlaceBanner({
  place,
  selected,
  days,
  onToggle,
  onDays,
  visited = false,
  onToggleVisited,
}: {
  place: RankedPlace & { imageUrl?: string };
  selected: boolean;
  days: number;
  onToggle: () => void;
  onDays: (days: number) => void;
  visited?: boolean;
  onToggleVisited?: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden border-[3px] border-primary transition-all",
        selected ? "bg-primary-container neo-shadow" : "bg-surface-container-lowest neo-shadow-hover",
      )}
    >
      {/* Rank tab */}
      <div className="absolute left-0 top-0 z-10 border-b-2 border-r-2 border-primary bg-primary-container px-3 py-1.5 text-xl font-black text-primary">
        {String(place.rank).padStart(2, "0")}
      </div>

      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden border-b-[3px] border-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={place.imageUrl ?? `https://picsum.photos/seed/${place.id}/800/450`}
          alt={place.name}
          className={cn(
            "h-full w-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105",
            visited && "saturate-50",
          )}
        />
        <span className="absolute right-2 top-2 bg-primary px-2 py-1 text-[11px] font-black uppercase tracking-wide text-primary-container">
          {matchRate(place.id, place.rank)}% Match
        </span>
        {onToggleVisited && (
          <button
            onClick={onToggleVisited}
            className={cn(
              "absolute bottom-2 right-2 flex items-center gap-1 border-2 border-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
              visited
                ? "bg-tertiary text-white"
                : "bg-surface text-primary hover:bg-primary hover:text-white",
            )}
          >
            <BadgeCheck className="size-3.5" /> {visited ? "Visited" : "Been here?"}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-2xl font-bold uppercase leading-none">{place.name}</h3>

        {/* meta tags: season + AI recommended days */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="border border-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            {seasonBadge(place.bestSeason)}
          </span>
          {place.recommendedDays ? (
            <span className="border border-primary bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              AI: {place.recommendedDays}d
            </span>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-3 flex-1 text-sm font-medium leading-relaxed text-on-surface-variant">
          {place.description}
        </p>

        {place.highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {place.highlights.slice(0, 3).map((h) => (
              <span
                key={h}
                className="border border-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Sources / provenance */}
        {place.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            <span>Sourced</span>
            {place.sources.slice(0, 3).map((s, i) => {
              const Icon = SOURCE_ICON[s.kind];
              const chip = (
                <span className="inline-flex items-center gap-1 border border-primary px-1.5 py-0.5">
                  <Icon className="size-3" /> {s.kind}
                </span>
              );
              return s.url ? (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" className="hover:text-tertiary">
                  {chip}
                </a>
              ) : (
                <span key={i}>{chip}</span>
              );
            })}
          </div>
        )}

        {/* Days stepper */}
        <div className="mt-4 flex items-center justify-between border-t-2 border-primary/15 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            <Clock className="size-4" /> Days
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDays(Math.max(1, days - 1))}
              className="flex size-8 items-center justify-center border-2 border-primary bg-surface transition-colors hover:bg-primary hover:text-white"
              aria-label="Fewer days"
            >
              <Minus className="size-3.5" strokeWidth={3} />
            </button>
            <span className="w-6 text-center text-lg font-bold">{days}</span>
            <button
              onClick={() => onDays(days + 1)}
              className="flex size-8 items-center justify-center border-2 border-primary bg-surface transition-colors hover:bg-primary hover:text-white"
              aria-label="More days"
            >
              <Plus className="size-3.5" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Select */}
        <button
          onClick={onToggle}
          className={cn(
            "mt-4 flex items-center justify-center gap-2 border-2 border-primary px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors",
            selected
              ? "bg-primary text-white hover:bg-secondary"
              : "bg-primary-container text-primary hover:bg-primary hover:text-white",
          )}
        >
          {selected ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={3} />}
          {selected ? "Added to Trip" : "Add to Trip"}
        </button>
      </div>
    </div>
  );
}
