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
