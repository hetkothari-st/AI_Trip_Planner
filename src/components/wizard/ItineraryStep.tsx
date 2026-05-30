"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
  MapPin,
  BedDouble,
  Mountain,
  Utensils,
  BadgeCheck,
  Save,
  Check,
  Navigation,
} from "lucide-react";
import { MapPanel } from "@/components/map/MapPanel";
import { CityMiniMap } from "@/components/map/CityMiniMap";
import { useTrip, selectedList, selectedSpotsOf } from "@/lib/store/trip";
import { saveActiveTrip } from "@/lib/store/tripManager";
import { useTravels } from "@/lib/store/travels";
import { computeCost, formatINR } from "@/lib/cost";
import { downloadExcel, downloadPdf, type Sheet } from "@/lib/export";
import { formatDuration } from "@/lib/utils";
import { CostSummary } from "@/components/cost/CostSummary";

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function ItineraryStep() {
  const store = useTrip();
  const { destination, region, cityPlans, hotels, activities, route, back } = store;
  const places = selectedList(store);
  const totalDays = places.reduce((n, p) => n + p.days, 0);
  // Continuous day numbering across the whole trip: city i starts the day after city i-1 ends.
  const startDays: number[] = [];
  places.reduce((acc, p) => {
    startDays.push(acc);
    return acc + p.days;
  }, 0);
  const cost = computeCost({
    places: places.map((p) => ({ id: p.id, name: p.name, days: p.days })),
    hotels,
    activities,
    route,
  });
  const venues = places.reduce((n, p) => {
    const plan = cityPlans[p.id];
    return n + (plan ? selectedSpotsOf(store, p.id, plan).length : 0);
  }, 0);

  const router = useRouter();
  const { addManyVisited } = useTravels();
  const [logged, setLogged] = useState(false);
  const [savedTrip, setSavedTrip] = useState(false);

  function saveTrip() {
    saveActiveTrip("saved");
    setSavedTrip(true);
    setTimeout(() => setSavedTrip(false), 2500);
  }

  // Convert the whole planned trip into bucket-list entries, one per city, then jump to
  // the travel log. Per-place budget reuses the cost model (hotel + activities + food).
  function markVisited() {
    addManyVisited(
      places.map((p) => ({
        name: p.name,
        destination,
        regionName: region?.name,
        lat: p.lat,
        lng: p.lng,
        photoUrl: p.imageUrl,
        budget: Math.round(
          computeCost({ places: [{ id: p.id, name: p.name, days: p.days }], hotels, activities, route: null })
            .total,
        ),
        activities: (activities[p.id] ?? []).map((a) => a.name),
        companions: 2,
      })),
    );
    setLogged(true);
    setTimeout(() => router.push("/travels"), 600);
  }

  function exportExcel() {
    const itinRows: (string | number)[][] = [];
    places.forEach((p, idx) => {
      const plan = cityPlans[p.id];
      if (!plan) return;
      const spots = selectedSpotsOf(store, p.id, plan);
      const perDay = Math.max(1, Math.ceil(spots.length / p.days));
      spots.forEach((s, i) => {
        const day = startDays[idx] + Math.floor(i / perDay) + 1;
        itinRows.push([p.name, day, s.name, fmtMin(s.durationMin), s.category]);
      });
    });
    const hotelRows = places
      .filter((p) => hotels[p.id])
      .map((p) => {
        const h = hotels[p.id];
        return [p.name, h.name, h.stars, h.pricePerNight, p.days, h.pricePerNight * p.days, h.bestPriceSite];
      });
    const actRows = places.flatMap((p) =>
      (activities[p.id] ?? []).map((a) => [p.name, a.name, a.provider, a.price]),
    );
    const sheets: Sheet[] = [
      {
        name: "Overview",
        headers: ["Field", "Value"],
        rows: [
          ["Destination", destination],
          ["Region", region?.name ?? ""],
          ["Cities", places.length],
          ["Total days", totalDays],
          ["Distance (km)", route ? Math.round(route.totalDistanceKm) : 0],
          ["Estimated cost (INR)", Math.round(cost.total)],
        ],
      },
      { name: "Itinerary", headers: ["City", "Day", "Spot", "Duration", "Category"], rows: itinRows },
      { name: "Hotels", headers: ["City", "Hotel", "Stars", "Price/night", "Nights", "Subtotal", "Best site"], rows: hotelRows },
      { name: "Activities", headers: ["City", "Activity", "Provider", "Price"], rows: actRows },
      { name: "Costs", headers: ["Item", "Category", "Amount (INR)"], rows: cost.items.map((it) => [it.label, it.category, Math.round(it.amount)]) },
    ];
    downloadExcel(`${destination}-itinerary`, sheets);
  }

  const mapStops = places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));
  const routeLine = places.map((p) => p.name).join(" → ");

  return (
    <div className="animate-fade-in">
      {/* Action bar */}
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={back}
          className="flex items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveTrip}
            className="flex items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-surface-container"
          >
            {savedTrip ? <Check className="size-4" /> : <Save className="size-4" />}
            {savedTrip ? "Saved ✓" : "Save Trip"}
          </button>
          <button
            onClick={markVisited}
            disabled={logged}
            className="flex items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-tertiary hover:text-white disabled:opacity-60"
          >
            <BadgeCheck className="size-4" /> {logged ? "Added ✓" : "Mark Visited"}
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-primary-container"
          >
            <FileSpreadsheet className="size-4" /> Excel
          </button>
          <button
            onClick={downloadPdf}
            className="flex items-center gap-2 border-2 border-primary bg-primary-container px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <FileDown className="size-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Printable itinerary */}
        <div className="print-area space-y-8 lg:col-span-2">
          {/* hero header */}
          <header className="border-[3px] border-primary bg-surface-bright p-6 neo-shadow">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="border-2 border-primary bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                Confirmed Itinerary
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                AT-{(destination || "TRIP").slice(0, 3).toUpperCase()}
                {String(places.length)}
                {String(totalDays)}
              </span>
            </div>
            <h1 className="text-5xl font-bold uppercase leading-[0.85] tracking-tighter md:text-6xl">
              {region?.name ? `${region.name},` : ""}
              <br />
              <span className="text-tertiary">{destination}</span>
            </h1>
            <p className="mt-3 text-base font-medium text-on-surface-variant">{routeLine}</p>
          </header>

          {/* route map */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest">Route Map</h2>
            <div className="h-[320px] overflow-hidden border-[3px] border-primary">
              <MapPanel stops={mapStops} route={route} />
            </div>
          </section>

          {/* continuous trip — cities in route order, days run end-to-end */}
          {places.map((p, idx) => {
            const plan = cityPlans[p.id];
            const hotel = hotels[p.id];
            const acts = activities[p.id] ?? [];
            const spots = plan ? selectedSpotsOf(store, p.id, plan) : [];
            const perDay = plan ? Math.max(1, Math.ceil(spots.length / p.days)) : 0;
            const startDay = startDays[idx];
            const leg = idx > 0 ? route?.legs[idx - 1] : null;
            const dayRange =
              p.days === 1 ? `Day ${startDay + 1}` : `Days ${startDay + 1}–${startDay + p.days}`;
            return (
              <section key={p.id} className="break-inside-avoid">
                {/* travel connector from previous city */}
                {leg && (
                  <div className="my-3 flex items-center gap-2 pl-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    <Navigation className="size-3.5 text-tertiary" />
                    Drive {Math.round(leg.distanceKm)} km · {formatDuration(leg.durationSec)} to {p.name}
                  </div>
                )}
                <div className="border-[3px] border-primary bg-surface-container-lowest neo-shadow">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-primary bg-primary-container p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center border-2 border-primary bg-primary text-sm font-black text-primary-container">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-3xl font-bold uppercase tracking-tighter">{p.name}</h2>
                    </div>
                    <span className="border-2 border-primary bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                      {dayRange}
                    </span>
                  </div>

                  {plan && (
                    <div className="grid gap-6 p-5 md:grid-cols-[1fr_240px]">
                      <div className="space-y-4">
                        {Array.from({ length: p.days }).map((_, dayIdx) => {
                          const daySpots = spots.slice(dayIdx * perDay, (dayIdx + 1) * perDay);
                          if (!daySpots.length) return null;
                          return (
                            <div key={dayIdx}>
                              <h3 className="mb-2 inline-block bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-white">
                                Day {startDay + dayIdx + 1}
                              </h3>
                              <ul className="space-y-2">
                                {daySpots.map((s, i) => (
                                  <li key={i} className="flex items-start gap-3 border-l-2 border-primary pl-3">
                                    <div>
                                      <p className="font-bold uppercase">{s.name}</p>
                                      <p className="text-sm font-medium text-on-surface-variant">
                                        {fmtMin(s.durationMin)} · {s.description}
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>

                      <aside className="space-y-3 text-sm">
                        {hotel && (
                          <div className="border-2 border-primary bg-surface-container p-3">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              <BedDouble className="size-3.5" /> Stay
                            </p>
                            <p className="mt-1 font-bold uppercase">{hotel.name}</p>
                            <p className="text-xs font-medium text-on-surface-variant">
                              {hotel.stars}★ · {formatINR(hotel.pricePerNight)}/night · {hotel.bestPriceSite}
                            </p>
                          </div>
                        )}
                        {acts.length > 0 && (
                          <div className="border-2 border-primary bg-surface-container p-3">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              <Mountain className="size-3.5" /> Activities
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {acts.map((a) => (
                                <li key={a.id} className="text-xs font-medium text-on-surface-variant">
                                  {a.name} · {formatINR(a.price)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="border-2 border-primary bg-surface-container p-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            <Utensils className="size-3.5" /> Must-try
                          </p>
                          <p className="mt-1 text-xs font-medium text-on-surface-variant">
                            {plan.localFood.join(", ")}
                          </p>
                        </div>
                      </aside>
                    </div>
                  )}

                  {/* per-city map (screen only) */}
                  {plan && (spots.length > 0 || hotel) && (
                    <div className="no-print border-t-[3px] border-primary p-5">
                      <CityMiniMap
                        hotel={hotel ? { name: hotel.name, lat: hotel.lat, lng: hotel.lng } : undefined}
                        spots={spots
                          .filter((s) => s.lat != null && s.lng != null)
                          .map((s) => ({ name: s.name, lat: s.lat!, lng: s.lng! }))}
                        activities={acts
                          .filter((a) => a.lat != null && a.lng != null)
                          .map((a) => ({ name: a.name, lat: a.lat!, lng: a.lng! }))}
                      />
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* cost breakdown */}
          <section className="break-inside-avoid border-[3px] border-primary bg-surface-container-lowest p-5 neo-shadow">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest">Cost Breakdown</h2>
            <ul className="space-y-1 text-sm">
              {cost.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-primary/15 py-1">
                  <span className="font-medium">{it.label}</span>
                  <span className="font-bold">{formatINR(it.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t-2 border-primary pt-3 text-lg font-bold uppercase">
              <span>Total · 2 travellers</span>
              <span>{formatINR(cost.total)}</span>
            </div>
          </section>
        </div>

        {/* Sidebar stats + export */}
        <aside className="no-print space-y-8 lg:sticky lg:top-24 lg:self-start">
          <div className="border-[3px] border-primary bg-tertiary p-6 text-white neo-shadow">
            <h3 className="mb-4 border-b border-white/20 pb-3 text-xl font-bold uppercase tracking-tight">
              Itinerary Stats
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="uppercase opacity-70">Total Distance</dt>
                <dd className="text-lg font-bold">
                  {route ? `${Math.round(route.totalDistanceKm)} KM` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase opacity-70">Drive Time</dt>
                <dd className="text-lg font-bold">
                  {route ? formatDuration(route.totalDurationSec) : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase opacity-70">Cities · Days</dt>
                <dd className="text-lg font-bold">
                  {places.length} · {totalDays}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase opacity-70">Venues Visited</dt>
                <dd className="text-lg font-bold">{venues}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase opacity-70">Est. Cost</dt>
                <dd className="text-lg font-bold">{formatINR(cost.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="border-[3px] border-primary bg-surface-bright p-5 neo-shadow">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest">Export</h3>
            <div className="space-y-2">
              <button
                onClick={downloadPdf}
                className="flex w-full items-center gap-2 border-2 border-primary bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-tertiary"
              >
                <FileDown className="size-4" /> Download PDF
              </button>
              <button
                onClick={exportExcel}
                className="flex w-full items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-primary-container"
              >
                <FileSpreadsheet className="size-4" /> Export Excel
              </button>
              <button
                onClick={saveTrip}
                className="flex w-full items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-primary-container"
              >
                {savedTrip ? <Check className="size-4" /> : <Save className="size-4" />}
                {savedTrip ? "Saved to My Trips" : "Save Trip"}
              </button>
              <button
                onClick={markVisited}
                disabled={logged}
                className="flex w-full items-center gap-2 border-2 border-primary bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-tertiary hover:text-white disabled:opacity-60"
              >
                <BadgeCheck className="size-4" /> {logged ? "Added to Travels" : "Mark as Visited"}
              </button>
            </div>
          </div>

          <CostSummary />
        </aside>
      </div>
    </div>
  );
}
