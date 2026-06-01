"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Clock, ImageOff } from "lucide-react";
import type { CitySpot } from "@/lib/ai/schemas";

interface Photo {
  url: string;
  attribution?: string;
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Lightbox showing a gallery of real photos for a single spot. Fetches /api/spot-photos
 * on open (Wikimedia Commons), with a hero image + thumbnail strip.
 */
export function SpotPhotoModal({
  spot,
  destination,
  city,
  onClose,
}: {
  spot: CitySpot;
  destination: string;
  city: string;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    setActive(0);
    const q = new URLSearchParams({ name: `${spot.name} ${city}`, destination });
    fetch(`/api/spot-photos?${q}`)
      .then((r) => r.json())
      .then((d) => on && setPhotos(d.photos ?? []))
      .catch(() => on && setPhotos([]))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [spot.name, city, destination]);

  // Close on Escape.
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const hero = photos?.[active];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border-[3px] border-primary bg-surface-bright neo-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-primary bg-primary p-4 text-white">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-bold uppercase tracking-tighter">{spot.name}</h3>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-container">
              <Clock className="size-3.5" /> {fmtMin(spot.durationMin)} · {spot.category}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center border-2 border-white hover:bg-white hover:text-primary"
          >
            <X className="size-5" strokeWidth={3} />
          </button>
        </div>

        {/* body */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* hero image */}
          <div className="relative flex h-[38vh] shrink-0 items-center justify-center border-b-[3px] border-primary bg-surface-container">
            {loading ? (
              <Loader2 className="size-8 animate-spin text-on-surface-variant" />
            ) : hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.url} alt={spot.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm font-bold uppercase tracking-wide text-on-surface-variant">
                <ImageOff className="size-8" /> No photos found
              </span>
            )}
          </div>

          {/* thumbnails */}
          {photos && photos.length > 1 && (
            <div className="flex shrink-0 flex-wrap gap-2 border-b-2 border-primary/15 bg-surface-bright p-3">
              {photos.map((p, i) => (
                <button
                  key={p.url}
                  onClick={() => setActive(i)}
                  className={
                    "size-16 shrink-0 overflow-hidden border-2 transition-all " +
                    (i === active ? "border-primary neo-shadow-sm" : "border-primary/30 opacity-70 hover:opacity-100")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`${spot.name} ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* details */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-surface-bright p-4">
            <p className="text-sm font-medium text-on-surface-variant">{spot.description}</p>
            {hero?.attribution && (
              <p className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant/70">
                {hero.attribution}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
