"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { TopNav } from "@/components/chrome/TopNav";
import { TripSidebar } from "@/components/chrome/TripSidebar";
import { DestinationStep } from "@/components/wizard/DestinationStep";
import { RegionStep } from "@/components/wizard/RegionStep";
import { CategoryStep } from "@/components/wizard/CategoryStep";
import { PlacesStep } from "@/components/wizard/PlacesStep";
import { CitiesStep } from "@/components/wizard/CitiesStep";
import { MapStep } from "@/components/wizard/MapStep";
import { ItineraryStep } from "@/components/wizard/ItineraryStep";
import { useTrip, snapshotOf, tripHasContent, type WizardStep } from "@/lib/store/trip";
import { saveActiveTrip, startNewTrip } from "@/lib/store/tripManager";
import { useTrips } from "@/lib/store/trips";

export default function PlanPage() {
  const [mounted, setMounted] = useState(false);
  const store = useTrip();
  const { activeId, trips } = useTrips();
  const [savedFlag, setSavedFlag] = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasContent = tripHasContent(snapshotOf(store));

  // The furthest step the user may jump to, based on the data they've provided.
  const maxReached: WizardStep = !store.regions.length
    ? 0
    : !store.region
      ? 1
      : !store.places.length
        ? 2
        : Object.keys(store.selected).length
          ? 6
          : 3;

  const activeTrip = activeId ? trips.find((t) => t.id === activeId) : null;

  function saveDraft() {
    saveActiveTrip("draft");
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background bauhaus-grid">
      <TopNav search />

      {mounted && (
        <TripSidebar
          step={store.step}
          maxReached={maxReached}
          onJump={store.goTo}
          onSave={saveDraft}
          onNewTrip={() => (hasContent ? setNewTripOpen(true) : startNewTrip())}
          saved={savedFlag}
          tripName={activeTrip?.name}
        />
      )}

      <AlertDialog
        open={newTripOpen}
        onOpenChange={setNewTripOpen}
        title="Start a new trip?"
        description="Your current trip will be saved as a draft in My trips, and the planner will reset to a blank slate."
        confirmLabel="Save & start new"
        onConfirm={() => startNewTrip({ save: true })}
      />

      <main className="px-6 pb-24 pt-28 md:px-10 lg:ml-72 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          {!mounted ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="animate-fade-in">
              {store.step === 0 && <DestinationStep />}
              {store.step === 1 && <RegionStep />}
              {store.step === 2 && <CategoryStep />}
              {store.step === 3 && <PlacesStep />}
              {store.step === 4 && <CitiesStep />}
              {store.step === 5 && <MapStep />}
              {store.step === 6 && <ItineraryStep />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
