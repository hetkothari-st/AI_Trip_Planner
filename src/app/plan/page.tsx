"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/wizard/Stepper";
import { DestinationStep } from "@/components/wizard/DestinationStep";
import { RegionStep } from "@/components/wizard/RegionStep";
import { CategoryStep } from "@/components/wizard/CategoryStep";
import { PlacesStep } from "@/components/wizard/PlacesStep";
import { MapStep } from "@/components/wizard/MapStep";
import { useTrip, type WizardStep } from "@/lib/store/trip";

export default function PlanPage() {
  const [mounted, setMounted] = useState(false);
  const store = useTrip();
  useEffect(() => setMounted(true), []);

  // The furthest step the user may jump to, based on the data they've provided.
  const maxReached: WizardStep = !store.regions.length
    ? 0
    : !store.region
      ? 1
      : !store.places.length
        ? 2
        : Object.keys(store.selected).length
          ? 4
          : 3;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="font-serif text-lg font-semibold">Voyager</span>
          </Link>
          {mounted && (
            <div className="hidden flex-1 justify-center md:flex">
              <Stepper step={store.step} maxReached={maxReached} onJump={store.goTo} />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              store.reset();
            }}
          >
            <RotateCcw className="size-4" /> Restart
          </Button>
        </div>
      </header>

      <main className="container py-10">
        {!mounted ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : (
          <div className="animate-fade-in">
            {store.step === 0 && <DestinationStep />}
            {store.step === 1 && <RegionStep />}
            {store.step === 2 && <CategoryStep />}
            {store.step === 3 && <PlacesStep />}
            {store.step === 4 && <MapStep />}
          </div>
        )}
      </main>
    </div>
  );
}
