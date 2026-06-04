import { seededRandom } from "@/lib/utils";

const STAR_BASE: Record<number, number> = { 1: 1200, 2: 1800, 3: 2800, 4: 4500, 5: 7000 };

function clampStars(stars: number): number {
  return Math.min(5, Math.max(1, Math.round(stars))) || 3;
}

/** Plausible per-night INR for a real hotel we have no live price for. Deterministic per name. */
export function estimateHotelPrice(name: string, stars: number): number {
  const base = STAR_BASE[clampStars(stars)] ?? 2800;
  const jitter = 0.85 + seededRandom(`hotelprice-${name}`) * 0.3; // ±15%
  return Math.round((base * jitter) / 50) * 50;
}

/** Plausible per-person INR for an activity. Adventure costs more; longer costs more. */
export function estimateActivityPrice(name: string, category: string, durationMin: number): number {
  const perHour = /adventure|sport|trek|raft|paraglid/i.test(category) ? 900 : 500;
  const base = 300 + (durationMin / 60) * perHour;
  const jitter = 0.85 + seededRandom(`actprice-${name}`) * 0.3;
  return Math.round((base * jitter) / 50) * 50;
}
