"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NewVisited } from "@/lib/store/travels";
import type { VisitedPlace } from "@/lib/travels/types";

const inputCls = "h-10 text-sm";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

export function VisitedForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Add to travel log",
}: {
  initial?: VisitedPlace;
  onSubmit: (data: NewVisited) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [regionName, setRegionName] = useState(initial?.regionName ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [budget, setBudget] = useState(initial?.budget ? String(initial.budget) : "");
  const [companions, setCompanions] = useState(
    initial?.companions ? String(initial.companions) : "",
  );
  const [activities, setActivities] = useState((initial?.activities ?? []).join(", "));
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? "");

  const canSubmit = name.trim().length > 0 && destination.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      destination: destination.trim(),
      regionName: regionName.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: budget ? Number(budget) : undefined,
      companions: companions ? Number(companions) : undefined,
      activities: activities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      rating: rating || undefined,
      notes: notes.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Place *</label>
          <Input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kedarnath Temple"
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>Destination *</label>
          <Input
            className={inputCls}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Uttarakhand"
          />
        </div>
        <div>
          <label className={labelCls}>Region (optional)</label>
          <Input
            className={inputCls}
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            placeholder="e.g. Garhwal"
          />
        </div>
        <div>
          <label className={labelCls}>Budget spent (₹)</label>
          <Input
            className={inputCls}
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 18000"
          />
        </div>
        <div>
          <label className={labelCls}>From</label>
          <Input
            className={inputCls}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>To</label>
          <Input
            className={inputCls}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Travellers</label>
          <Input
            className={inputCls}
            type="number"
            min={1}
            value={companions}
            onChange={(e) => setCompanions(e.target.value)}
            placeholder="e.g. 2"
          />
        </div>
        <div>
          <label className={labelCls}>Rating</label>
          <div className="flex h-10 items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n === rating ? 0 : n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "size-5 transition-colors",
                    n <= rating ? "fill-accent text-accent" : "text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Activities done (comma-separated)</label>
        <Input
          className={inputCls}
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          placeholder="e.g. trekking, river rafting, temple visit"
        />
      </div>

      <div>
        <label className={labelCls}>Photo URL (optional — we&apos;ll find one if you skip it)</label>
        <Input
          className={inputCls}
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything memorable — where you stayed, tips for next time…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
