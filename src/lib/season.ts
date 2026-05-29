import type { Season } from "@/lib/ai/schemas";

export const SEASON_ORDER: Season[] = ["spring", "summer", "monsoon", "autumn", "winter"];

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  monsoon: "Monsoon",
  autumn: "Autumn",
  winter: "Winter",
};

export const SEASON_EMOJI: Record<Season, string> = {
  spring: "🌸",
  summer: "☀️",
  monsoon: "🌧️",
  autumn: "🍂",
  winter: "❄️",
};

/** Indicative month range per season (Indian Himalayan calendar). */
export const SEASON_MONTHS: Record<Season, string> = {
  spring: "Mar–Apr",
  summer: "May–Jun",
  monsoon: "Jul–Sep",
  autumn: "Oct–Nov",
  winter: "Dec–Feb",
};

/** "🍂 Autumn (Oct–Nov)" style label for a best-season badge. */
export function seasonBadge(season: Season): string {
  return `${SEASON_EMOJI[season]} ${SEASON_LABEL[season]} (${SEASON_MONTHS[season]})`;
}
