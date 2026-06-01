"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, Map as MapIcon, BarChart3, ArrowRight, Loader2, MapPin } from "lucide-react";
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

      {/* Visual showcase */}
      <section className="w-full px-6 pb-32 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-12 gap-4">
            <div className="group relative col-span-12 h-[300px] overflow-hidden border-4 border-primary md:col-span-8 md:h-[440px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://picsum.photos/seed/aether-himalaya/1200/900"
                alt="Mountain landscape"
                className="size-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
              />
              <div className="absolute bottom-8 left-8 bg-primary p-6 text-white neo-shadow">
                <p className="text-3xl font-black uppercase leading-tight tracking-tighter md:text-4xl">
                  Uttarakhand
                  <br />
                  Exploration 01
                </p>
              </div>
            </div>
            <div className="col-span-12 grid grid-rows-2 gap-4 md:col-span-4">
              <div className="flex flex-col justify-end border-4 border-primary bg-tertiary p-8">
                <h4 className="text-3xl font-bold uppercase tracking-tighter text-white">
                  North Star
                  <br />
                  Guidance
                </h4>
              </div>
              <div className="group relative overflow-hidden border-4 border-primary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://picsum.photos/seed/aether-stone/600/400"
                  alt="Stone architecture"
                  className="size-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                />
              </div>
            </div>
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
