"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, Clock, ImageOff, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { CitySpot } from "@/lib/ai/schemas";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

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

  // Zoom + pan for the hero photo.
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  // Reset the view whenever a different photo becomes active.
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [active]);

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
          <div
            className="relative flex h-[38vh] shrink-0 items-center justify-center overflow-hidden border-b-[3px] border-primary bg-surface-container"
            onWheel={(e) => {
              if (!hero) return;
              setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
            }}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            }}
            onMouseMove={(e) => {
              if (!drag.current) return;
              setOffset({
                x: drag.current.ox + (e.clientX - drag.current.x),
                y: drag.current.oy + (e.clientY - drag.current.y),
              });
            }}
            onMouseUp={() => (drag.current = null)}
            onMouseLeave={() => (drag.current = null)}
            style={{ cursor: zoom > 1 ? (drag.current ? "grabbing" : "grab") : "default" }}
          >
            {loading ? (
              <Loader2 className="size-8 animate-spin text-on-surface-variant" />
            ) : hero ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.url}
                  alt={spot.name}
                  draggable={false}
                  className="h-full w-full select-none object-contain transition-transform duration-100"
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
                />
                {/* zoom controls */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                    disabled={zoom <= MIN_ZOOM}
                    aria-label="Zoom out"
                    className="flex size-8 items-center justify-center border-2 border-primary bg-surface text-primary transition-colors hover:bg-primary-container disabled:opacity-40"
                  >
                    <ZoomOut className="size-4" strokeWidth={2.5} />
                  </button>
                  <span className="min-w-[3rem] border-2 border-primary bg-surface px-2 py-1 text-center text-[11px] font-bold tabular-nums text-primary">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                    disabled={zoom >= MAX_ZOOM}
                    aria-label="Zoom in"
                    className="flex size-8 items-center justify-center border-2 border-primary bg-surface text-primary transition-colors hover:bg-primary-container disabled:opacity-40"
                  >
                    <ZoomIn className="size-4" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={resetView}
                    disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
                    aria-label="Reset zoom"
                    className="flex size-8 items-center justify-center border-2 border-primary bg-surface text-primary transition-colors hover:bg-primary-container disabled:opacity-40"
                  >
                    <RotateCcw className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              </>
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
