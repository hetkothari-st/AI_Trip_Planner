"use client";

import { Wallet, BedDouble, Mountain, Car, Utensils } from "lucide-react";
import { useTrip, selectedList } from "@/lib/store/trip";
import { computeCost, formatINR, type CostCategory } from "@/lib/cost";

const CAT_META: Record<CostCategory, { label: string; icon: typeof BedDouble }> = {
  hotel: { label: "Hotels", icon: BedDouble },
  activity: { label: "Activities", icon: Mountain },
  travel: { label: "Travel", icon: Car },
  food: { label: "Food & local", icon: Utensils },
};

export function CostSummary({ compact = false }: { compact?: boolean }) {
  const store = useTrip();
  const places = selectedList(store);
  const cost = computeCost({
    places: places.map((p) => ({ id: p.id, name: p.name, days: p.days })),
    hotels: store.hotels,
    activities: store.activities,
    route: store.route,
  });

  return (
    <div className="border-[3px] border-primary bg-surface-bright p-5 neo-shadow">
      <div className="flex items-center justify-between border-b-2 border-primary pb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
          <Wallet className="size-4" /> Est. Cost
        </h3>
        <span className="text-2xl font-bold">{formatINR(cost.total)}</span>
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
        For 2 travellers · updates live
      </p>

      <dl className="mt-4 space-y-3">
        {(Object.keys(CAT_META) as CostCategory[]).map((c) => {
          const Icon = CAT_META[c].icon;
          const amt = cost.byCategory[c];
          const pct = cost.total > 0 ? Math.round((amt / cost.total) * 100) : 0;
          return (
            <div key={c}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-on-surface-variant">
                  <Icon className="size-3.5" /> {CAT_META[c].label}
                </span>
                <span className="font-bold">{formatINR(amt)}</span>
              </div>
              <div className="mt-1 h-2 w-full border border-primary bg-surface-container">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </dl>

      {!compact && cost.items.length > 0 && (
        <ul className="mt-4 space-y-1 border-t-2 border-primary/15 pt-3 text-xs text-on-surface-variant">
          {cost.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="truncate">{it.label}</span>
              <span className="shrink-0 font-bold">{formatINR(it.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
