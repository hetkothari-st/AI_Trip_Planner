import { getLLM } from "./provider";
import { mockCategories, mockCityPlan, mockPlaces, mockRegions } from "./mock";
import {
  CategoriesResponseSchema,
  CityPlanSchema,
  RankedPlacesResponseSchema,
  RegionsResponseSchema,
  type Category,
  type CityPlan,
  type RankedPlace,
  type Region,
} from "./schemas";
import type { ResearchDigest } from "@/lib/research";

const SYSTEM = `You are an expert India-focused travel researcher. You produce concise,
accurate, structured recommendations. Coordinates must be real and plausible. Never
invent fake URLs. Always return data via the provided tool.`;

// JSON schemas handed to Claude's tool-use. Kept loose-but-guided; zod does final validation.
const regionsJsonSchema = {
  type: "object",
  properties: {
    regions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          blurb: { type: "string" },
          highlights: { type: "array", items: { type: "string" } },
          seasonality: {
            type: "object",
            description: "0-100 desirability per season",
            properties: {
              spring: { type: "number" }, summer: { type: "number" }, monsoon: { type: "number" },
              autumn: { type: "number" }, winter: { type: "number" },
            },
          },
          bestSeason: { type: "string", enum: ["spring", "summer", "monsoon", "autumn", "winter"] },
          samplePlaces: { type: "array", items: { type: "string" } },
          lat: { type: "number" }, lng: { type: "number" },
        },
        required: ["id", "name", "blurb", "highlights", "seasonality", "bestSeason", "samplePlaces", "lat", "lng"],
      },
    },
  },
  required: ["regions"],
};

const categoriesJsonSchema = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" }, label: { type: "string" },
          description: { type: "string" }, icon: { type: "string" },
        },
        required: ["id", "label", "description"],
      },
    },
  },
  required: ["categories"],
};

const placesJsonSchema = {
  type: "object",
  properties: {
    places: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" }, name: { type: "string" }, categoryId: { type: "string" },
          rank: { type: "number" }, description: { type: "string" },
          bestSeason: { type: "string", enum: ["spring", "summer", "monsoon", "autumn", "winter"] },
          highlights: { type: "array", items: { type: "string" } },
          lat: { type: "number" }, lng: { type: "number" }, imageQuery: { type: "string" },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["web", "youtube", "reddit", "x", "ai"] },
                title: { type: "string" }, url: { type: "string" },
              },
              required: ["kind", "title"],
            },
          },
        },
        required: ["id", "name", "categoryId", "rank", "description", "bestSeason", "highlights", "lat", "lng", "imageQuery", "sources"],
      },
    },
  },
  required: ["places"],
};

/** Phase 1 — discover the regions/belts of a destination with seasonality. */
export async function discoverRegions(destination: string): Promise<Region[]> {
  const res = await getLLM().generate({
    system: SYSTEM,
    prompt: `List the distinct travel regions/belts of "${destination}". For each, give a
short blurb, what travellers love (highlights), a seasonality index (0-100 per season),
the best season, a few sample places, and an approximate center lat/lng.`,
    schema: RegionsResponseSchema,
    jsonSchema: regionsJsonSchema,
    mock: () => ({ regions: mockRegions(destination) }),
  });
  return res.regions;
}

/** Phase 2 — generate region-specific, customizable place categories. */
export async function generateCategories(
  destination: string,
  region: Region,
): Promise<Category[]> {
  const res = await getLLM().generate({
    system: SYSTEM,
    prompt: `For the "${region.name}" region of ${destination}, propose 4-6 ways a traveller
might want to explore it (e.g. most-visited, popular/trending, traditional culture,
untouched/offbeat, adventure). Tailor them to what THIS region actually offers — do not
return a fixed generic list. Give each a short id, label, description, and an icon hint.`,
    schema: CategoriesResponseSchema,
    jsonSchema: categoriesJsonSchema,
    mock: () => ({ categories: mockCategories(destination, region.id) }),
  });
  return res.categories;
}

/** Phase 3 — rank top places for the chosen categories, grounded in research. */
export async function rankPlaces(
  destination: string,
  region: Region,
  categoryIds: string[],
  research?: ResearchDigest,
): Promise<RankedPlace[]> {
  const researchBlock = research?.notes?.length
    ? `\n\nResearch signals to ground your ranking (from web/YouTube/Reddit):\n${research.notes
        .map((n) => `- ${n}`)
        .join("\n")}`
    : "";

  const res = await getLLM().generate({
    system: SYSTEM,
    prompt: `Rank the top places to visit in the "${region.name}" region of ${destination}
for these categories: ${categoryIds.join(", ")}. Return up to 6 places per category, each
with a rank (1 = best within its category), a vivid description, best season, highlights,
real coordinates, an image search query, and source references.${researchBlock}`,
    schema: RankedPlacesResponseSchema,
    jsonSchema: placesJsonSchema,
    mock: () => ({ places: mockPlaces(destination, region.id, categoryIds) }),
  });
  // Merge any real research sources into AI/mock output for transparency.
  return res.places;
}

const cityPlanJsonSchema = {
  type: "object",
  properties: {
    city: { type: "string" },
    recommendedDays: { type: "number" },
    famousFor: { type: "array", items: { type: "string" } },
    localFood: { type: "array", items: { type: "string" } },
    spots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          durationMin: { type: "number" },
          category: { type: "string", enum: ["sightseeing", "nature", "activity", "food", "spiritual"] },
        },
        required: ["name", "description", "durationMin", "category"],
      },
    },
    foodPlaces: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, dish: { type: "string" }, note: { type: "string" } },
        required: ["name", "dish"],
      },
    },
  },
  required: ["city", "recommendedDays", "famousFor", "localFood", "spots", "foodPlaces"],
};

/** Phase 5 — a city's mini-itinerary: spots, durations, food, what it's famous for. */
export async function generateCityPlan(
  destination: string,
  city: string,
  days: number,
  research?: ResearchDigest,
): Promise<CityPlan> {
  const researchBlock = research?.notes?.length
    ? `\n\nGround your picks in these research signals:\n${research.notes.map((n) => `- ${n}`).join("\n")}`
    : "";
  return getLLM().generate({
    system: SYSTEM,
    prompt: `Build a ${days}-day mini-itinerary for ${city} in ${destination}. Recommend the
best spots to visit (with realistic visit durations in minutes and a category), the best
local food places, what dishes the area is famous for, and a recommended number of days.
Order spots so they form a sensible daily routine (about 3 per day).${researchBlock}`,
    schema: CityPlanSchema,
    jsonSchema: cityPlanJsonSchema,
    mock: () => mockCityPlan(destination, city, days),
  });
}

export type { Region, Category, RankedPlace, CityPlan } from "./schemas";
