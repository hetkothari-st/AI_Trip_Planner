import { seededRandom } from "@/lib/utils";
import type {
  Category,
  RankedPlace,
  Region,
  Season,
} from "./schemas";

/**
 * Deterministic mock data so the whole flow is demoable with zero API keys.
 * A curated Uttarakhand dataset powers the canonical demo; anything else gets a
 * plausible procedurally generated set seeded by the destination name.
 */

const SEASONS: Season[] = ["spring", "summer", "monsoon", "autumn", "winter"];

function seasonality(seed: string): Record<Season, number> {
  const out = {} as Record<Season, number>;
  SEASONS.forEach((s, i) => {
    out[s] = Math.round(30 + seededRandom(`${seed}-${s}-${i}`) * 70);
  });
  return out;
}

function bestSeasonOf(s: Record<Season, number>): Season {
  return (Object.entries(s).sort((a, b) => b[1] - a[1])[0][0]) as Season;
}

// ─── Curated Uttarakhand demo data ────────────────────────────────────────────

const UTTARAKHAND_REGIONS: Region[] = [
  {
    id: "garhwal",
    name: "Garhwal",
    blurb:
      "The western Himalayan belt of high peaks, the Char Dham pilgrimage, and the spiritual hubs of Rishikesh and Haridwar.",
    highlights: ["Char Dham pilgrimage", "Valley of Flowers", "River rafting", "High-altitude treks"],
    seasonality: { spring: 85, summer: 78, monsoon: 35, autumn: 88, winter: 55 },
    bestSeason: "autumn",
    samplePlaces: ["Rishikesh", "Auli", "Valley of Flowers", "Kedarnath"],
    lat: 30.16,
    lng: 78.94,
  },
  {
    id: "kumaon",
    name: "Kumaon",
    blurb:
      "The eastern belt of serene lakes, colonial hill stations, and panoramic Nanda Devi views.",
    highlights: ["Naini Lake", "Jim Corbett wildlife", "Quiet hill stations", "Himalayan vistas"],
    seasonality: { spring: 90, summer: 82, monsoon: 40, autumn: 86, winter: 60 },
    bestSeason: "spring",
    samplePlaces: ["Nainital", "Mukteshwar", "Jim Corbett", "Munsiyari"],
    lat: 29.38,
    lng: 79.46,
  },
  {
    id: "terai",
    name: "Terai / Foothills",
    blurb:
      "The lush lowland fringe of dense forests, grasslands, and wildlife reserves where the plains meet the hills.",
    highlights: ["Wildlife safaris", "Forest stays", "Birdwatching", "Easy access"],
    seasonality: { spring: 80, summer: 55, monsoon: 30, autumn: 82, winter: 88 },
    bestSeason: "winter",
    samplePlaces: ["Jim Corbett", "Rajaji National Park", "Haldwani"],
    lat: 29.2,
    lng: 79.1,
  },
];

const UTTARAKHAND_PLACES: Record<string, { name: string; lat: number; lng: number; categories: string[] }[]> = {
  garhwal: [
    { name: "Rishikesh", lat: 30.087, lng: 78.267, categories: ["popular", "most-visited", "spiritual"] },
    { name: "Auli", lat: 30.527, lng: 79.566, categories: ["popular", "adventure"] },
    { name: "Valley of Flowers", lat: 30.728, lng: 79.605, categories: ["untouched", "adventure"] },
    { name: "Chopta", lat: 30.36, lng: 79.2, categories: ["untouched", "adventure"] },
    { name: "Kedarnath", lat: 30.735, lng: 79.067, categories: ["spiritual", "most-visited"] },
    { name: "Mussoorie", lat: 30.459, lng: 78.066, categories: ["popular", "most-visited"] },
    { name: "Khirsu", lat: 30.13, lng: 78.79, categories: ["untouched", "traditional"] },
    { name: "Lansdowne", lat: 29.84, lng: 78.68, categories: ["traditional", "untouched"] },
  ],
  kumaon: [
    { name: "Nainital", lat: 29.38, lng: 79.45, categories: ["popular", "most-visited"] },
    { name: "Mukteshwar", lat: 29.47, lng: 79.65, categories: ["untouched", "traditional"] },
    { name: "Munsiyari", lat: 30.07, lng: 80.24, categories: ["untouched", "adventure"] },
    { name: "Kausani", lat: 29.84, lng: 79.6, categories: ["traditional", "popular"] },
    { name: "Jim Corbett", lat: 29.53, lng: 78.77, categories: ["most-visited", "adventure"] },
  ],
  terai: [
    { name: "Jim Corbett National Park", lat: 29.53, lng: 78.77, categories: ["most-visited", "adventure"] },
    { name: "Rajaji National Park", lat: 30.0, lng: 78.2, categories: ["untouched", "adventure"] },
  ],
};

const GENERIC_CATEGORIES = (regionName: string): Category[] => [
  { id: "most-visited", label: "Most Visited", description: `The landmark stops in ${regionName} that nearly every traveller sees.`, icon: "landmark" },
  { id: "popular", label: "Popular & Trending", description: `Crowd-favourite spots buzzing across social media right now.`, icon: "flame" },
  { id: "traditional", label: "Traditional Culture", description: `Places steeped in local heritage, crafts, and village life.`, icon: "temple" },
  { id: "untouched", label: "Untouched & Offbeat", description: `Quiet, pristine corners away from the tourist trail.`, icon: "leaf" },
  { id: "adventure", label: "Adventure", description: `Treks, rafting, and high-adrenaline experiences.`, icon: "mountain" },
];

function isUttarakhand(dest: string) {
  return /uttarakhand|uttaranchal/i.test(dest);
}

// ─── Public mock builders ──────────────────────────────────────────────────────

export function mockRegions(destination: string): Region[] {
  if (isUttarakhand(destination)) return UTTARAKHAND_REGIONS;
  // Generic: synthesize three regions seeded by the destination.
  return ["North", "Central", "Coastal / Lowland"].map((suffix, i) => {
    const s = seasonality(`${destination}-${suffix}`);
    return {
      id: `${destination.toLowerCase().replace(/\s+/g, "-")}-${i}`,
      name: `${suffix} ${destination}`,
      blurb: `The ${suffix.toLowerCase()} belt of ${destination}, with its own distinct landscapes and pace.`,
      highlights: ["Scenic drives", "Local cuisine", "Signature landmarks", "Regional festivals"],
      seasonality: s,
      bestSeason: bestSeasonOf(s),
      samplePlaces: [`${suffix} Town`, "Old Quarter", "Hill Viewpoint"],
      lat: 28 + seededRandom(`${destination}-lat-${i}`) * 6,
      lng: 76 + seededRandom(`${destination}-lng-${i}`) * 8,
    };
  });
}

export function mockCategories(destination: string, regionId: string): Category[] {
  const region = mockRegions(destination).find((r) => r.id === regionId);
  return GENERIC_CATEGORIES(region?.name ?? destination);
}

export function mockPlaces(
  destination: string,
  regionId: string,
  categoryIds: string[],
): RankedPlace[] {
  const catSet = new Set(categoryIds);
  let pool: { name: string; lat: number; lng: number; categories: string[] }[];

  if (isUttarakhand(destination) && UTTARAKHAND_PLACES[regionId]) {
    pool = UTTARAKHAND_PLACES[regionId];
  } else {
    // synthesize a few places per requested category
    pool = categoryIds.flatMap((cat, ci) =>
      [0, 1, 2].map((n) => ({
        name: `${cat.replace(/-/g, " ")} highlight ${n + 1}`,
        lat: 28 + seededRandom(`${destination}-${cat}-${n}-lat`) * 6,
        lng: 76 + seededRandom(`${destination}-${cat}-${n}-lng`) * 8,
        categories: [cat],
      })),
    );
  }

  const matches = pool.filter((p) => p.categories.some((c) => catSet.has(c)));
  const ranked = (matches.length ? matches : pool).map((p, i) => {
    const categoryId = p.categories.find((c) => catSet.has(c)) ?? categoryIds[0] ?? "popular";
    const s = seasonality(`${destination}-${p.name}`);
    return {
      id: `${regionId}-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: p.name,
      categoryId,
      rank: i + 1,
      description: `${p.name} is a standout in ${destination}, loved for its scenery and character. Travellers across blogs and videos consistently rate it among the best stops here.`,
      bestSeason: bestSeasonOf(s),
      highlights: ["Photogenic viewpoints", "Local food", "Easy to combine with nearby stops"],
      lat: p.lat,
      lng: p.lng,
      imageQuery: `${p.name} ${destination} landscape`,
      sources: [
        { kind: "web" as const, title: `Top things to do in ${p.name}` },
        { kind: "youtube" as const, title: `${p.name} travel vlog` },
        { kind: "reddit" as const, title: `r/india trip notes: ${p.name}` },
      ],
    };
  });

  // re-rank within each category so ranks are 1..n per category bucket
  const byCat: Record<string, number> = {};
  return ranked.map((p) => {
    byCat[p.categoryId] = (byCat[p.categoryId] ?? 0) + 1;
    return { ...p, rank: byCat[p.categoryId] };
  });
}
