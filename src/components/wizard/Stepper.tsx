"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "@/lib/store/trip";

const STEPS = ["Destination", "Region", "Style", "Places", "Map"] as const;

export function Stepper({
  step,
  onJump,
  maxReached,
}: {
  step: WizardStep;
  onJump: (s: WizardStep) => void;
  maxReached: WizardStep;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {STEPS.map((label, i) => {
        const idx = i as WizardStep;
        const done = idx < step;
        const active = idx === step;
        const reachable = idx <= maxReached;
        return (
          <li key={label} className="flex items-center">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(idx)}
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1 text-sm transition-colors",
                reachable ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary bg-primary/10 text-primary",
                  !active && !done && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-6 bg-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}
