"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  Map as MapIcon,
  BarChart3,
  ArrowRight,
  Loader2,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopNav } from "@/components/chrome/TopNav";
import { useTrip } from "@/lib/store/trip";

const FEATURES = [
  {
    icon: Brain,
    title: "Aether Engine",
    body: "Hyper-personalized route optimization based on seasonal shifts and localized data streams.",
    tone: "surface",
  },
  {
    icon: MapIcon,
    title: "Dynamic Mapping",
    body: "Real-time geospatial visualization of your upcoming journey, rendered live.",
    tone: "yellow",
  },
  {
    icon: BarChart3,
    title: "Budget Flux",
    body: "Precision forecasting for travel expenses using historical pricing and local trends.",
    tone: "red",
  },
] as const;

const DESTINATIONS = [
  { name: "Uttarakhand", blurb: "Himalayan peaks, valleys & spiritual towns", seed: "uttarakhand-himalaya" },
  { name: "Kerala", blurb: "Backwaters, beaches & misty tea hills", seed: "kerala-backwater" },
  { name: "Rajasthan", blurb: "Desert forts, palaces & vivid bazaars", seed: "rajasthan-fort" },
  { name: "Himachal Pradesh", blurb: "Snow trails, pine valleys & hill towns", seed: "himachal-snow" },
  { name: "Goa", blurb: "Coastline, nightlife & Portuguese heritage", seed: "goa-coast" },
] as const;

export default function Home() {
  const router = useRouter();
  const { setDestination, setRegions, goTo } = useTrip();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live destination autocomplete.
  const [suggestions, setSuggestions] = useState<{ name: string; label: string }[]>([]);
  const [showSug, setShowSug] = useState(false);
  // Skip the next debounce fetch after a programmatic value change (suggestion pick).
  const skipFetch = useRef(false);

  // Featured-destinations carousel.
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % DESTINATIONS.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/place-suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.suggestions ?? []) as { name: string; label: string }[];
        setSuggestions(list);
        setShowSug(list.length > 0);
      } catch {
        /* aborted or network error — ignore */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  function pick(name: string) {
    skipFetch.current = true;
    setValue(name);
    setShowSug(false);
    setSuggestions([]);
    analyze(name);
  }

  async function analyze(override?: string) {
    const dest = (override ?? value).trim();
    if (dest.length < 2) {
      setError("Enter a destination to analyze.");
      return;
    }
    setShowSug(false);
    setLoading(true);
    setError(null);
    setDestination(dest);
    try {
      const res = await fetch("/api/regions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination: dest }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setRegions(data.regions);
      goTo(1);
      router.push("/plan");
    } catch {
      setError("Analysis failed. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <TopNav />

      {/* Hero */}
      <main className="relative min-h-screen overflow-hidden px-6 pt-20 md:px-8">
        {/* Bauhaus geometric background motifs */}
        <div className="absolute left-[-5rem] top-1/4 -z-10 size-64 rotate-12 border-4 border-primary bg-primary-container" />
        <div className="absolute bottom-1/4 right-[-4rem] -z-10 size-80 rounded-full border-4 border-primary bg-secondary" />

        <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
          <div className="mt-4 space-y-3">
            <span className="inline-block border-2 border-primary bg-tertiary px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-white neo-shadow">
              AI Optimization Active
            </span>
            <h1 className="text-4xl font-extrabold uppercase leading-[0.85] tracking-tighter text-primary md:text-[4.5rem]">
              Search Your
              <br />
              Destination
            </h1>
          </div>

          {/* Massive search bar */}
          <div className="relative mt-8 w-full max-w-2xl">
            <div className="group relative">
              <div className="absolute -inset-1.5 -z-10 bg-primary transition-colors duration-300 group-focus-within:bg-tertiary" />
              <div className="flex flex-col items-center gap-3 border-4 border-primary bg-surface p-3 md:flex-row md:p-5">
                <div className="w-full flex-1 text-left">
                  <label className="mb-1.5 block text-[0.55rem] font-bold uppercase tracking-widest text-on-surface-variant">
                    Where to?
                  </label>
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSug(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") analyze();
                      if (e.key === "Escape") setShowSug(false);
                    }}
                    placeholder="UTTARAKHAND"
                    autoComplete="off"
                    className="w-full border-b-4 border-primary bg-transparent py-1 text-xl font-bold uppercase outline-none transition-colors placeholder:text-surface-dim focus:border-tertiary md:text-3xl"
                  />
                </div>
                <button
                  onClick={() => analyze()}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 border-4 border-primary bg-primary-container px-6 py-3 text-base font-bold uppercase text-primary neo-shadow-hover disabled:opacity-70 md:w-auto"
                >
                  {loading ? "Analyzing" : "Analyze"}
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <ArrowRight className="size-5" strokeWidth={3} />
                  )}
                </button>
              </div>

              {/* live autocomplete dropdown */}
              {showSug && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto border-4 border-primary bg-surface neo-shadow">
                  {suggestions.map((s) => (
                    <li key={s.label}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pick(s.name);
                        }}
                        className="flex w-full items-start gap-3 border-b-2 border-primary/15 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-primary-container"
                      >
                        <MapPin className="mt-0.5 size-4 shrink-0 text-tertiary" strokeWidth={2.5} />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold uppercase tracking-tight text-primary">
                            {s.name}
                          </span>
                          <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
                            {s.label}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {error && (
              <p className="mt-4 text-left text-sm font-bold uppercase tracking-wide text-secondary">
                {error}
              </p>
            )}
          </div>

          {/* Feature grid */}
          <div className="mb-20 mt-12 grid w-full max-w-2xl grid-cols-1 gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={
                  "group cursor-default border-4 border-primary p-5 text-left transition-colors " +
                  (f.tone === "yellow"
                    ? "bg-primary-container hover:bg-primary hover:text-white"
                    : f.tone === "red"
                      ? "bg-secondary text-white hover:bg-tertiary"
                      : "bg-surface hover:bg-tertiary hover:text-white")
                }
              >
                <f.icon className="mb-2 size-6" strokeWidth={2.5} />
                <h3 className="mb-1.5 text-lg font-bold uppercase">{f.title}</h3>
                <p className="text-xs font-medium uppercase leading-relaxed tracking-tight opacity-80">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Featured destinations — auto-sliding, each slide starts planning */}
      <section className="w-full px-6 pb-28 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between border-b-4 border-primary pb-4">
            <h2 className="text-2xl font-extrabold uppercase tracking-tighter text-primary md:text-4xl">
              Featured Destinations
            </h2>
            <span className="hidden text-xs font-bold uppercase tracking-widest text-on-surface-variant md:block">
              Tap a slide to start planning
            </span>
          </div>

          {/* slider */}
          <div className="group relative h-[320px] overflow-hidden border-4 border-primary neo-shadow md:h-[480px]">
            {DESTINATIONS.map((d, i) => (
              <button
                key={d.name}
                type="button"
                onClick={() => analyze(d.name)}
                aria-label={`Plan a trip to ${d.name}`}
                className={cn(
                  "absolute inset-0 transition-opacity duration-700",
                  i === slide ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${d.seed}/1400/900`}
                  alt={d.name}
                  className="size-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                />
                <div className="absolute bottom-6 left-6 max-w-md border-4 border-primary bg-primary p-5 text-left text-white neo-shadow md:bottom-8 md:left-8 md:p-6">
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-primary-container">
                    Exploration {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-2xl font-black uppercase leading-[0.9] tracking-tighter md:text-4xl">
                    {d.name}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide opacity-80 md:text-xs">
                    {d.blurb}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-container">
                    Plan This Trip <ArrowRight className="size-4" strokeWidth={3} />
                  </span>
                </div>
              </button>
            ))}

            {/* prev / next */}
            <button
              type="button"
              onClick={() => setSlide((s) => (s - 1 + DESTINATIONS.length) % DESTINATIONS.length)}
              aria-label="Previous destination"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 border-2 border-primary bg-surface p-2 transition-colors hover:bg-primary-container"
            >
              <ChevronLeft className="size-5" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => setSlide((s) => (s + 1) % DESTINATIONS.length)}
              aria-label="Next destination"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 border-2 border-primary bg-surface p-2 transition-colors hover:bg-primary-container"
            >
              <ChevronRight className="size-5" strokeWidth={3} />
            </button>
          </div>

          {/* quick-pick chips double as slide nav */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {DESTINATIONS.map((d, i) => (
              <button
                key={d.name}
                type="button"
                onClick={() => setSlide(i)}
                className={cn(
                  "border-2 border-primary px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                  i === slide ? "bg-primary text-white" : "bg-surface hover:bg-primary-container",
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex w-full flex-col items-center justify-between gap-8 border-t-2 border-primary bg-surface-container-low px-6 py-12 md:flex-row md:px-8">
        <div className="text-sm font-bold text-primary">
          © 2026 AETHER TRAVEL AI. PRECISION EXPLORATION.
        </div>
        <div className="flex gap-12">
          <Link href="/trips" className="text-sm font-medium text-on-surface-variant hover:text-primary">
            My Trips
          </Link>
          <Link href="/travels" className="text-sm font-medium text-on-surface-variant hover:text-primary">
            My Travels
          </Link>
          <Link href="/plan" className="text-sm font-medium text-on-surface-variant hover:text-primary">
            Planner
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-secondary" />
          <span className="text-sm font-bold uppercase">System Active</span>
        </div>
      </footer>
    </div>
  );
}
