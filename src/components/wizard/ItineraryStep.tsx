"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
  MapPin,
  Clock,
  BedDouble,
  Mountain,
  Utensils,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPanel } from "@/components/map/MapPanel";
import { useTrip, selectedList } from "@/lib/store/trip";
import { useTravels } from "@/lib/store/travels";
import { computeCost, formatINR } from "@/lib/cost";
import { downloadExcel, downloadPdf, type Sheet } from "@/lib/export";
import { formatDuration } from "@/lib/utils";

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

  const router = useRouter();
  const { addManyVisited } = useTravels();
  const [logged, setLogged] = useState(false);

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
      const perDay = Math.ceil(plan.spots.length / p.days);
      plan.spots.forEach((s, i) => {
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

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={markVisited} disabled={logged}>
            <BadgeCheck className="size-4" /> {logged ? "Added to travels ✓" : "Mark trip as visited"}
          </Button>
          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="size-4" /> Export Excel
          </Button>
          <Button onClick={downloadPdf}>
            <FileDown className="size-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="print-area space-y-8 rounded-xl">
        {/* hero */}
        <header className="rounded-xl border bg-gradient-to-br from-primary/10 to-accent/10 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Your trip itinerary
          </p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight">
            {region?.name}, {destination}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" /> {places.length} cities
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-primary" /> {totalDays} days
            </span>
            {route && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4 text-primary" /> {Math.round(route.totalDistanceKm)} km ·{" "}
                {formatDuration(route.totalDurationSec)} driving
              </span>
            )}
            <span className="flex items-center gap-1.5 font-semibold">
              {formatINR(cost.total)} est. for 2
            </span>
          </div>
        </header>

        {/* mini-map */}
        <section>
          <h2 className="mb-3 font-serif text-2xl font-semibold">Route map</h2>
          <div className="h-[320px] overflow-hidden rounded-xl border">
            <MapPanel stops={mapStops} route={route} />
          </div>
        </section>

        {/* one continuous trip — cities in optimized route order, days run end-to-end */}
        {places.map((p, idx) => {
          const plan = cityPlans[p.id];
          const hotel = hotels[p.id];
          const acts = activities[p.id] ?? [];
          const perDay = plan ? Math.ceil(plan.spots.length / p.days) : 0;
          const startDay = startDays[idx];
          const leg = idx > 0 ? route?.legs[idx - 1] : null;
          const dayRange =
            p.days === 1
              ? `Day ${startDay + 1}`
              : `Days ${startDay + 1}–${startDay + p.days}`;
          return (
            <section key={p.id} className="break-inside-avoid space-y-0">
              {/* travel connector from the previous city */}
              {leg && (
                <div className="my-2 flex items-center gap-2 pl-4 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  Drive {Math.round(leg.distanceKm)} km · {formatDuration(leg.durationSec)} to{" "}
                  {p.name}
                </div>
              )}
              <div className="rounded-xl border p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {idx + 1}
                </span>
                <h2 className="font-serif text-2xl font-semibold">{p.name}</h2>
                <Badge variant="muted">{dayRange}</Badge>
              </div>

              {plan && (
                <div className="mt-4 grid gap-6 md:grid-cols-[1fr_260px]">
                  <div className="space-y-4">
                    {Array.from({ length: p.days }).map((_, dayIdx) => {
                      const daySpots = plan.spots.slice(dayIdx * perDay, (dayIdx + 1) * perDay);
                      if (!daySpots.length) return null;
                      return (
                        <div key={dayIdx}>
                          <h3 className="mb-1.5 font-semibold">Day {startDay + dayIdx + 1}</h3>
                          <ul className="ml-4 list-disc space-y-1 text-sm">
                            {daySpots.map((s, i) => (
                              <li key={i}>
                                <span className="font-medium">{s.name}</span>{" "}
                                <span className="text-muted-foreground">
                                  — {fmtMin(s.durationMin)} · {s.description}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  <aside className="space-y-3 text-sm">
                    {hotel && (
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="flex items-center gap-1.5 font-medium">
                          <BedDouble className="size-4 text-primary" /> Stay
                        </p>
                        <p className="mt-1">{hotel.name}</p>
                        <p className="text-muted-foreground">
                          {hotel.stars}★ · {formatINR(hotel.pricePerNight)}/night · best on {hotel.bestPriceSite}
                        </p>
                      </div>
                    )}
                    {acts.length > 0 && (
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="flex items-center gap-1.5 font-medium">
                          <Mountain className="size-4 text-primary" /> Activities
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {acts.map((a) => (
                            <li key={a.id} className="text-muted-foreground">
                              {a.name} · {formatINR(a.price)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Utensils className="size-4 text-primary" /> Must-try
                      </p>
                      <p className="mt-1 text-muted-foreground">{plan.localFood.join(", ")}</p>
                    </div>
                  </aside>
                </div>
              )}
              </div>
            </section>
          );
        })}

        {/* cost breakdown */}
        <section className="break-inside-avoid rounded-xl border p-5">
          <h2 className="mb-3 font-serif text-2xl font-semibold">Cost breakdown</h2>
          <ul className="space-y-1 text-sm">
            {cost.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-3 border-b py-1">
                <span>{it.label}</span>
                <span className="font-medium">{formatINR(it.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between text-lg font-semibold">
            <span>Total (2 travellers)</span>
            <span>{formatINR(cost.total)}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
