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
