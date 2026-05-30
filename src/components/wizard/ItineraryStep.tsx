"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  MapPin,
  BedDouble,
  Mountain,
  Share2,
  Check,
  Clock,
} from "lucide-react";
import { MapPanel } from "@/components/map/MapPanel";
import { useTrip, selectedList, selectedSpotsOf } from "@/lib/store/trip";
import { formatDuration } from "@/lib/utils";
import { formatINR, computeCost } from "@/lib/cost";
import { CostSummary } from "@/components/cost/CostSummary";

function fmtH(min: number): string {
  const h = Math.round((min / 60) * 10) / 10;
  return `${h}h`;
}

export function ItineraryStep() {
  const store = useTrip();
  const { destination, region, back } = store;
  const places = selectedList(store);
  const cost = useMemo(
    () =>
      computeCost({
        places: places.map((p) => ({ id: p.id, name: p.name, days: p.days })),
        hotels: store.hotels,
        activities: store.activities,
        route: store.route,
      }),
    [places, store.hotels, store.activities, store.route],
  );

  const totalDays = places.reduce((n, p) => n + p.days, 0);
  const venues = places.reduce((n, p) => {
    const plan = store.cityPlans[p.id];
    return n + (plan ? selectedSpotsOf(store, p.id, plan).length : 0);
  }, 0);
  const [shared, setShared] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  function downloadPDF() {
    window.print();
  }

  function shareTrip() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  function downloadExcel() {
    // Build a simple CSV (opens in Excel) from the selected trip.
    const rows: string[][] = [["City", "Days", "Hotel", "Hotel/night", "Activities", "Spots"]];
    places.forEach((p) => {
      const plan = store.cityPlans[p.id];
      const hotel = store.hotels[p.id];
      const acts = store.activities[p.id] ?? [];
      const spots = plan ? selectedSpotsOf(store, p.id, plan).map((s) => s.name) : [];
      rows.push([
        p.name,
        String(p.days),
        hotel?.name ?? "—",
        hotel ? String(hotel.pricePerNight) : "—",
        acts.map((a) => a.name).join("; ") || "—",
        spots.join("; ") || "—",
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${destination}-itinerary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mapStops = places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
  const routeLine = places.map((p) => p.name).join(" → ");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="border-2 border-primary bg-primary-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary neo-shadow-sm">
              Confirmed Itinerary
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              ART-{(destination || "TRIP").slice(0, 3).toUpperCase()}01
            </span>
          </div>
          <h1 className="text-5xl font-bold uppercase leading-[0.85] tracking-tighter md:text-7xl">
            {destination}
          </h1>
          <p className="mt-3 text-lg font-medium text-on-surface-variant">{routeLine}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={back}
            className="flex items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary transition-colors hover:bg-surface-container"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 border-2 border-primary bg-surface-container-lowest px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:bg-primary hover:text-white"
          >
            <Download className="size-4" /> PDF
          </button>
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 border-2 border-primary bg-primary-container px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <FileSpreadsheet className="size-4" /> Excel
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left/main — printable itinerary */}
        <div ref={printRef} className="print-area space-y-8 lg:col-span-2">
          {places.map((p, idx) => {
            const plan = store.cityPlans[p.id];
            const hotel = store.hotels[p.id];
            const acts = store.activities[p.id] ?? [];
            const spots = plan ? selectedSpotsOf(store, p.id, plan) : [];
            return (
              <div key={p.id} className="border-[3px] border-primary bg-surface-container-lowest neo-shadow">
                <div className="flex items-center justify-between border-b-[3px] border-primary bg-primary-container p-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Stop {String(idx + 1).padStart(2, "0")} · {p.days} {p.days === 1 ? "day" : "days"}
                    </p>
                    <h3 className="text-3xl font-bold uppercase tracking-tighter">{p.name}</h3>
                  </div>
                  {hotel && (
                    <span className="flex items-center gap-1.5 text-sm font-bold uppercase">
                      <BedDouble className="size-4" /> {hotel.name}
                    </span>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  {spots.length > 0 ? (
                    spots.map((s) => (
                      <div key={s.name} className="flex items-start gap-4">
                        <span className="flex w-16 shrink-0 items-center gap-1 pt-0.5 text-xs font-bold uppercase">
                          <Clock className="size-3" /> {fmtH(s.durationMin)}
                        </span>
                        <div className="border-l-2 border-primary pl-4">
                          <p className="font-bold uppercase">{s.name}</p>
                          <p className="text-sm font-medium text-on-surface-variant">{s.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-on-surface-variant">
                      No spots selected for this stop.
                    </p>
                  )}

                  {acts.length > 0 && (
                    <div className="border-t-2 border-primary/15 pt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        <Mountain className="size-3.5" /> Activities
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {acts.map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-2">
                            <span className="font-medium">{a.name}</span>
                            <span className="font-bold">{formatINR(a.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right sidebar — stats + map + export */}
        <aside className="no-print space-y-8 lg:sticky lg:top-24 lg:self-start">
          {/* Trip stats */}
          <div className="border-[3px] border-primary bg-tertiary p-6 text-white neo-shadow">
            <h3 className="mb-4 text-xl font-bold uppercase tracking-tight">Trip Stats</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <dt className="uppercase">Total Distance</dt>
                <dd className="text-lg font-bold">
                  {store.route ? `${Math.round(store.route.totalDistanceKm)} KM` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <dt className="uppercase">Drive Time</dt>
                <dd className="text-lg font-bold">
                  {store.route ? formatDuration(store.route.totalDurationSec) : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <dt className="uppercase">Cities · Days</dt>
                <dd className="text-lg font-bold">
                  {places.length} · {totalDays}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <dt className="uppercase">Venues Visited</dt>
                <dd className="text-lg font-bold">{venues}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase">Est. Cost</dt>
                <dd className="text-lg font-bold">{formatINR(cost.total)}</dd>
              </div>
            </dl>
          </div>

          {/* Route visualization */}
          <div className="border-[3px] border-primary bg-surface-container-lowest p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest">
              Route Visualization
            </h3>
            <div className="relative aspect-square overflow-hidden border-2 border-primary">
              <MapPanel stops={mapStops} route={store.route} />
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              {region?.name ?? destination}
            </p>
          </div>

          {/* Export */}
          <div className="border-[3px] border-primary bg-surface-bright p-5 neo-shadow">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest">Export</h3>
            <div className="space-y-2">
              <button
                onClick={downloadPDF}
                className="flex w-full items-center gap-2 border-2 border-primary bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-tertiary"
              >
                <Download className="size-4" /> Download PDF
              </button>
              <button
                onClick={downloadExcel}
                className="flex w-full items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-primary-container"
              >
                <FileSpreadsheet className="size-4" /> Export Excel
              </button>
              <button
                onClick={shareTrip}
                className="flex w-full items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-primary-container"
              >
                {shared ? <Check className="size-4" /> : <Share2 className="size-4" />}
                {shared ? "Link Copied" : "Share Trip"}
              </button>
            </div>
          </div>

          <CostSummary />
        </aside>
      </div>
    </div>
  );
}
