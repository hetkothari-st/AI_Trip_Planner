"use client";

import {
  MapPin,
  Compass,
  Sparkles,
  Building2,
  CalendarDays,
  Route,
  FileDown,
  Save,
  Check,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "@/lib/store/trip";

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Destination", icon: MapPin },
  { label: "Regions", icon: Compass },
  { label: "Style", icon: Sparkles },
  { label: "Cities", icon: Building2 },
  { label: "Plan", icon: CalendarDays },
  { label: "Map", icon: Route },
  { label: "Itinerary", icon: FileDown },
];

/**
 * The fixed left "TRIP ENGINE" workspace rail. Replaces the old horizontal Stepper:
 * each wizard step is a nav item; the active step is the signal-yellow block.
 */
export function TripSidebar({
  step,
  maxReached,
  onJump,
  onSave,
  onNewTrip,
  saved,
  tripName,
}: {
  step: WizardStep;
  maxReached: WizardStep;
  onJump: (s: WizardStep) => void;
  onSave: () => void;
  onNewTrip: () => void;
  saved: boolean;
  tripName?: string | null;
}) {
  return (
    <aside className="fixed left-0 top-[57px] z-40 hidden h-[calc(100vh-57px)] w-72 flex-col border-r-2 border-primary bg-surface-bright p-5 lg:flex">
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Trip Engine
        </h2>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-tertiary">
          AI Optimization Active
        </p>
        {tripName && (
          <p className="mt-3 truncate border-l-2 border-primary pl-2 text-xs font-medium text-on-surface-variant">
            {tripName}
          </p>
        )}
        <button
          type="button"
          onClick={onNewTrip}
          className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-tertiary"
        >
          <Plus className="size-3.5" /> New Trip
        </button>
      </div>

      <nav className="flex-1 space-y-1.5">
        {STEPS.map(({ label, icon: Icon }, i) => {
          const idx = i as WizardStep;
          const active = idx === step;
          const reachable = idx <= maxReached;
          return (
            <button
              key={label}
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(idx)}
              className={cn(
                "flex w-full items-center gap-3 border-2 px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wide transition-all",
                active
                  ? "border-primary bg-primary-container text-on-primary-container neo-shadow-sm"
                  : reachable
                    ? "border-transparent text-on-surface-variant hover:border-primary hover:bg-surface-container"
                    : "cursor-not-allowed border-transparent text-on-surface-variant/40",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-4">
        <button
          type="button"
          onClick={onSave}
          className="flex w-full items-center justify-center gap-2 border-2 border-primary bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
        >
          {saved ? <Check className="size-4" /> : <Save className="size-4" />}
          {saved ? "Saved" : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={() => onJump(6)}
          className="w-full border-2 border-primary bg-primary px-4 py-3.5 text-sm font-bold uppercase tracking-widest text-white neo-shadow transition-all hover:bg-primary-container hover:text-primary"
        >
          Finalize Trip
        </button>
      </div>
    </aside>
  );
}
