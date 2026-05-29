"use client";

import { Check, Plus, Star, Youtube, Globe, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEASON_EMOJI, SEASON_LABEL } from "@/lib/season";
import type { RankedPlace, Source } from "@/lib/ai/schemas";

const SOURCE_ICON: Record<Source["kind"], typeof Globe> = {
  web: Globe,
  youtube: Youtube,
  reddit: MessageSquare,
  x: MessageSquare,
  ai: Star,
};

export function PlaceBanner({
  place,
  selected,
  days,
  onToggle,
  onDays,
}: {
  place: RankedPlace & { imageUrl?: string };
  selected: boolean;
  days: number;
  onToggle: () => void;
  onDays: (days: number) => void;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="relative h-44 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={place.imageUrl ?? `https://picsum.photos/seed/${place.id}/800/450`}
          alt={place.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge className="absolute left-3 top-3 bg-black/65 text-white backdrop-blur">
          #{place.rank} ranked
        </Badge>
        <Badge variant="secondary" className="absolute right-3 top-3">
          {SEASON_EMOJI[place.bestSeason]} {SEASON_LABEL[place.bestSeason]}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold">{place.name}</h3>
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{place.description}</p>

        {place.highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {place.highlights.slice(0, 3).map((h) => (
              <Badge key={h} variant="muted">
                {h}
              </Badge>
            ))}
          </div>
        )}

        {place.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Sourced from</span>
            {place.sources.slice(0, 3).map((s, i) => {
              const Icon = SOURCE_ICON[s.kind];
              const chip = (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <Icon className="size-3" /> {s.kind}
                </span>
              );
              return s.url ? (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
                  {chip}
                </a>
              ) : (
                <span key={i}>{chip}</span>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant={selected ? "secondary" : "default"}
            size="sm"
            onClick={onToggle}
            className="flex-1"
          >
            {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
            {selected ? "Added to trip" : "Add to trip"}
          </Button>

          {selected && (
            <div className="flex items-center rounded-md border">
              <button
                className="px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => onDays(days - 1)}
                aria-label="Fewer days"
              >
                −
              </button>
              <span className="min-w-[64px] text-center text-sm">
                {days} {days === 1 ? "day" : "days"}
              </span>
              <button
                className="px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => onDays(days + 1)}
                aria-label="More days"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
