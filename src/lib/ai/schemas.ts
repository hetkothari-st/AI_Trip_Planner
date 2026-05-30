import { z } from "zod";

/**
 * Structured-output contracts for the AI layer. These double as the JSON schema we
 * hand to Claude's tool-use (so the model must return exactly this shape) and as the
 * runtime validator for any provider's output (real or mock).
 */

export const SeasonSchema = z.enum(["spring", "summer", "monsoon", "autumn", "winter"]);
export type Season = z.infer<typeof SeasonSchema>;

/** Phase 1 — a region/belt within a destination. */
export const RegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  blurb: z.string(),
  // "likings" — what a traveller tends to love here
  highlights: z.array(z.string()).min(1),
  // seasonality index: 0–100 desirability per season
  seasonality: z.record(SeasonSchema, z.number().min(0).max(100)),
  bestSeason: SeasonSchema,
  samplePlaces: z.array(z.string()).min(1),
  // approximate center for map framing
  lat: z.number(),
  lng: z.number(),
});
export type Region = z.infer<typeof RegionSchema>;

export const RegionsResponseSchema = z.object({ regions: z.array(RegionSchema).min(1) });

/** A flat list of notable place names for a region (used by the travel-log "what's left"). */
export const NotablePlacesResponseSchema = z.object({
  places: z.array(z.string()).min(1),
});

/** Phase 2 — a dynamically generated, region-specific place category. */
export const CategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  // short icon hint the UI maps to a lucide icon (e.g. "mountain", "temple", "leaf")
  icon: z.string().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CategoriesResponseSchema = z.object({
  categories: z.array(CategorySchema).min(3),
});

/** Phase 3 — a ranked place with a descriptive banner. */
export const SourceSchema = z.object({
  kind: z.enum(["web", "youtube", "reddit", "x", "ai"]),
  title: z.string(),
  url: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const RankedPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string(),
  rank: z.number().int().min(1),
  description: z.string(),
  bestSeason: SeasonSchema,
  // why it ranks here / what it's known for
  highlights: z.array(z.string()),
  lat: z.number(),
  lng: z.number(),
  imageQuery: z.string(), // used to fetch a banner image
  sources: z.array(SourceSchema),
});
export type RankedPlace = z.infer<typeof RankedPlaceSchema>;

export const RankedPlacesResponseSchema = z.object({
  places: z.array(RankedPlaceSchema).min(1),
});

/** Phase 5 — a spot/activity within a city's mini-itinerary. */
export const CitySpotSchema = z.object({
  name: z.string(),
  description: z.string(),
  durationMin: z.number().int().min(15),
  category: z.enum(["sightseeing", "nature", "activity", "food", "spiritual"]),
});
export type CitySpot = z.infer<typeof CitySpotSchema>;

/** Phase 5 — a recommended food place for a city. */
export const FoodPlaceSchema = z.object({
  name: z.string(),
  dish: z.string(),
  note: z.string().optional(),
});
export type FoodPlace = z.infer<typeof FoodPlaceSchema>;

/** Phase 10 — a bookable activity/experience in a city. */
export const ActivitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  provider: z.string(),
  durationMin: z.number().int().min(15),
  price: z.number().min(0), // per person, INR
  rating: z.number().min(0).max(5),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const ActivitiesResponseSchema = z.object({
  activities: z.array(ActivitySchema).min(1),
});

/** Phase 5 — full mini-itinerary for one city. */
export const CityPlanSchema = z.object({
  city: z.string(),
  recommendedDays: z.number().int().min(1).max(10),
  famousFor: z.array(z.string()).min(1),
  localFood: z.array(z.string()).min(1),
  spots: z.array(CitySpotSchema).min(1),
  foodPlaces: z.array(FoodPlaceSchema),
});
export type CityPlan = z.infer<typeof CityPlanSchema>;
