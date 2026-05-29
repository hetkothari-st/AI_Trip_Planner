"use client";

import { useState } from "react";
import { MapPin, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTrip } from "@/lib/store/trip";

const SUGGESTIONS = ["Uttarakhand", "Himachal Pradesh", "Kerala", "Rajasthan"];

export function DestinationStep() {
  const { destination, setDestination, setRegions, next } = useTrip();
  const [value, setValue] = useState(destination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(dest: string) {
    const trimmed = dest.trim();
    if (trimmed.length < 2) {
      setError("Please enter a destination.");
      return;
    }
    setLoading(true);
    setError(null);
    setDestination(trimmed);
    try {
      const res = await fetch("/api/regions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to load regions");
      const data = await res.json();
      setRegions(data.regions);
      next();
    } catch {
      setError("Something went wrong fetching regions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl text-center">
      <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
        Where would you like to go?
      </h1>
      <p className="mt-3 text-muted-foreground">
        Name a state, country, or region. Not sure where exactly? That’s the point — we’ll
        help you discover the right belt to visit.
      </p>

      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Uttarakhand"
            className="pl-10"
          />
        </div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {loading ? "Discovering" : "Discover regions"}
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setValue(s);
              submit(s);
            }}
            className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
