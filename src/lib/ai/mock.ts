import { seededRandom } from "@/lib/utils";
import { lookupCuratedCity } from "./cityData";
import type {
  Activity,
  Category,
  CityPlan,
  CitySpot,
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
    samplePlaces: ["Rishikesh", "Auli", "Valley of Flowers", "Kedarnath", "Mussoorie", "Chopta", "Badrinath", "Harsil"],
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
    samplePlaces: ["Nainital", "Mukteshwar", "Jim Corbett", "Munsiyari", "Kausani", "Almora", "Binsar", "Ranikhet"],
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
    samplePlaces: ["Jim Corbett", "Rajaji National Park", "Haldwani", "Ramnagar", "Kotdwar", "Tanakpur"],
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
    { name: "Badrinath", lat: 30.744, lng: 79.493, categories: ["spiritual", "most-visited"] },
    { name: "Mussoorie", lat: 30.459, lng: 78.066, categories: ["popular", "most-visited"] },
    { name: "Haridwar", lat: 29.945, lng: 78.164, categories: ["spiritual", "most-visited"] },
    { name: "Tungnath", lat: 30.489, lng: 79.215, categories: ["adventure", "spiritual", "untouched"] },
    { name: "Harsil", lat: 31.046, lng: 78.741, categories: ["untouched", "traditional"] },
    { name: "Khirsu", lat: 30.13, lng: 78.79, categories: ["untouched", "traditional"] },
    { name: "Lansdowne", lat: 29.84, lng: 78.68, categories: ["traditional", "untouched"] },
    { name: "Devprayag", lat: 30.146, lng: 78.598, categories: ["traditional", "spiritual"] },
    { name: "Gangotri", lat: 30.994, lng: 78.941, categories: ["spiritual", "adventure"] },
    { name: "Dhanaulti", lat: 30.426, lng: 78.241, categories: ["popular", "untouched"] },
  ],
  kumaon: [
    { name: "Nainital", lat: 29.38, lng: 79.45, categories: ["popular", "most-visited"] },
    { name: "Mukteshwar", lat: 29.47, lng: 79.65, categories: ["untouched", "traditional"] },
    { name: "Munsiyari", lat: 30.07, lng: 80.24, categories: ["untouched", "adventure"] },
    { name: "Kausani", lat: 29.84, lng: 79.6, categories: ["traditional", "popular"] },
    { name: "Almora", lat: 29.597, lng: 79.659, categories: ["traditional", "most-visited"] },
    { name: "Ranikhet", lat: 29.641, lng: 79.432, categories: ["popular", "traditional"] },
    { name: "Binsar", lat: 29.7, lng: 79.75, categories: ["untouched", "adventure"] },
    { name: "Jim Corbett", lat: 29.53, lng: 78.77, categories: ["most-visited", "adventure"] },
    { name: "Pithoragarh", lat: 29.583, lng: 80.218, categories: ["untouched", "traditional"] },
    { name: "Bhimtal", lat: 29.345, lng: 79.563, categories: ["popular", "most-visited"] },
    { name: "Chaukori", lat: 29.86, lng: 80.06, categories: ["untouched", "traditional"] },
    { name: "Patal Bhuvaneshwar", lat: 29.91, lng: 80.07, categories: ["traditional", "spiritual"] },
  ],
  terai: [
    { name: "Jim Corbett National Park", lat: 29.53, lng: 78.77, categories: ["most-visited", "adventure"] },
    { name: "Rajaji National Park", lat: 30.0, lng: 78.2, categories: ["untouched", "adventure"] },
    { name: "Ramnagar", lat: 29.394, lng: 79.127, categories: ["most-visited", "popular"] },
    { name: "Corbett Falls", lat: 29.45, lng: 78.93, categories: ["popular", "untouched"] },
    { name: "Sitabani Forest", lat: 29.42, lng: 79.18, categories: ["untouched", "traditional"] },
    { name: "Kotdwar", lat: 29.745, lng: 78.522, categories: ["traditional", "most-visited"] },
    { name: "Garjia Devi Temple", lat: 29.45, lng: 79.13, categories: ["spiritual", "traditional"] },
  ],
};

const GENERIC_CATEGORIES = (regionName: string): Category[] => [
  { id: "most-visited", label: "Most Visited", description: `The landmark stops in ${regionName} that nearly every traveller sees.`, icon: "landmark" },
  { id: "popular", label: "Popular & Trending", description: `Crowd-favourite spots buzzing across social media right now.`, icon: "flame" },
  { id: "traditional", label: "Traditional Culture", description: `Places steeped in local heritage, crafts, and village life.`, icon: "temple" },
  { id: "untouched", label: "Untouched & Offbeat", description: `Quiet, pristine corners away from the tourist trail.`, icon: "leaf" },
  { id: "adventure", label: "Adventure", description: `Treks, rafting, and high-adrenaline experiences.`, icon: "mountain" },
  { id: "spiritual", label: "Spiritual & Pilgrimage", description: `Temples, ghats, and sacred sites woven into the region's faith.`, icon: "temple" },
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
  region: Region,
  categoryIds: string[],
): RankedPlace[] {
  const regionId = region.id;
  const catSet = new Set(categoryIds);
  let pool: { name: string; lat: number; lng: number; categories: string[] }[];

  if (isUttarakhand(destination) && UTTARAKHAND_PLACES[regionId]) {
    pool = UTTARAKHAND_PLACES[regionId];
  } else {
    // Synthesize from the region's REAL sample places so names are plausible and
    // coordinates stay clustered around the region centre (never off in another country).
    const samples = region.samplePlaces?.length
      ? region.samplePlaces
      : [`${region.name} Town`, `${region.name} Viewpoint`, `${region.name} Valley`];
    pool = categoryIds.flatMap((cat) =>
      samples.map((name, n) => ({
        name,
        // jitter ≤ ~0.4° (~45 km) around the region centre — keeps pins inside the region.
        lat: region.lat + (seededRandom(`${destination}-${cat}-${name}-lat`) - 0.5) * 0.8,
        lng: region.lng + (seededRandom(`${destination}-${cat}-${name}-lng`) - 0.5) * 0.8,
        categories: [cat],
      })),
    );
  }

  const matches = pool.filter((p) => p.categories.some((c) => catSet.has(c)));
  const ranked = (matches.length ? matches : pool).map((p, i) => {
    const categoryId = p.categories.find((c) => catSet.has(c)) ?? categoryIds[0] ?? "popular";
    const s = seasonality(`${destination}-${p.name}`);
    return {
      id: `${regionId}-${categoryId}-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
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

/** Cities/towns of a region (mock) — drawn from its real sample places. */
export function mockCities(destination: string, region: Region, categoryId: string): RankedPlace[] {
  const curated = isUttarakhand(destination) ? UTTARAKHAND_PLACES[region.id] : undefined;
  const names = curated ? curated.map((p) => p.name) : region.samplePlaces;
  const coordOf = (name: string) => {
    const hit = curated?.find((p) => p.name === name);
    if (hit) return { lat: hit.lat, lng: hit.lng };
    return {
      lat: region.lat + (seededRandom(`${region.id}-${name}-lat`) - 0.5) * 0.8,
      lng: region.lng + (seededRandom(`${region.id}-${name}-lng`) - 0.5) * 0.8,
    };
  };
  return names.slice(0, 6).map((name, i) => {
    const { lat, lng } = coordOf(name);
    const s = seasonality(`${destination}-${name}`);
    return {
      id: `${region.id}-${categoryId}-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      categoryId,
      rank: i + 1,
      description: `${name} is a noted ${region.name} base in ${destination}, good for ${categoryId} travel — a comfortable hub for the area's key spots.`,
      bestSeason: bestSeasonOf(s),
      highlights: ["Central base", "Good stay options", "Easy day trips"],
      lat,
      lng,
      imageQuery: `${name} ${destination}`,
      recommendedDays: 1 + (i % 3),
      sources: [
        { kind: "web" as const, title: `Things to do in ${name}` },
        { kind: "youtube" as const, title: `${name} travel guide` },
      ],
    };
  });
}

// ─── Phase 5: mini-itinerary mock ──────────────────────────────────────────────

const SPOT_TEMPLATES: { suffix: string; category: CitySpot["category"]; durationMin: number }[] = [
  { suffix: "Main Viewpoint", category: "sightseeing", durationMin: 90 },
  { suffix: "Old Market & Bazaar", category: "sightseeing", durationMin: 75 },
  { suffix: "Lake / Riverfront", category: "nature", durationMin: 120 },
  { suffix: "Ancient Temple", category: "spiritual", durationMin: 60 },
  { suffix: "Nature Trail", category: "nature", durationMin: 150 },
  { suffix: "Sunset Point", category: "sightseeing", durationMin: 60 },
  { suffix: "Adventure Activity", category: "activity", durationMin: 180 },
  { suffix: "Local Museum", category: "sightseeing", durationMin: 60 },
  { suffix: "Cafe & Food Walk", category: "food", durationMin: 90 },
  { suffix: "Waterfall", category: "nature", durationMin: 120 },
  { suffix: "Heritage Walk", category: "sightseeing", durationMin: 90 },
  { suffix: "Viewpoint Trek", category: "activity", durationMin: 210 },
];

const LOCAL_FOOD = ["Aloo ke Gutke", "Bhatt ki Churkani", "Kafuli", "Bal Mithai", "Singori", "Garhwal ki Thali", "Mandua Roti", "Jhangora Kheer"];
const FAMOUS_FOR = ["Himalayan panoramas", "colonial-era charm", "temple architecture", "pine forests", "local handicrafts", "adventure sports", "sunrise points", "riverside ghats"];

export function mockCityPlan(destination: string, city: string, days: number): CityPlan {
  const d = Math.max(1, Math.min(10, days || 1));

  // Prefer real curated data for known cities so itineraries are genuine, not templated.
  const curated = lookupCuratedCity(city);
  if (curated) {
    return {
      city,
      recommendedDays: curated.recommendedDays,
      famousFor: curated.famousFor,
      localFood: curated.localFood,
      spots: curated.spots,
      foodPlaces: curated.foodPlaces,
    };
  }

  // ~3 spots per day, deterministically chosen + ordered by seed (generic fallback)
  const count = d * 3;
  const ordered = [...SPOT_TEMPLATES]
    .map((t, i) => ({ t, r: seededRandom(`${city}-${t.suffix}-${i}`) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, count)
    .map(({ t }) => ({
      name: `${city} ${t.suffix}`,
      description: `A highlight of ${city} — ${t.suffix.toLowerCase()} that travellers consistently recommend.`,
      durationMin: t.durationMin,
      category: t.category,
    }));

  const pick = (arr: string[], n: number, salt: string) =>
    [...arr]
      .map((v, i) => ({ v, r: seededRandom(`${city}-${salt}-${v}-${i}`) }))
      .sort((a, b) => a.r - b.r)
      .slice(0, n)
      .map((x) => x.v);

  const foods = pick(LOCAL_FOOD, 4, "food");
  return {
    city,
    recommendedDays: Math.max(1, Math.min(4, Math.round(1 + seededRandom(`${city}-days`) * 2))),
    famousFor: pick(FAMOUS_FOR, 3, "famous"),
    localFood: foods,
    spots: ordered,
    foodPlaces: foods.slice(0, 3).map((dish, i) => ({
      name: `${city} ${["Kitchen", "Cafe", "Bhojnalaya"][i % 3]}`,
      dish,
      note: i === 0 ? "Most recommended by locals and food vloggers" : undefined,
    })),
  };
}

// ─── Phase 10: activities mock ─────────────────────────────────────────────────

const ACTIVITY_TEMPLATES: { name: string; durationMin: number; price: number }[] = [
  { name: "Guided Sunrise Trek", durationMin: 240, price: 1200 },
  { name: "River Rafting Expedition", durationMin: 180, price: 1500 },
  { name: "Cable Car & Ropeway Ride", durationMin: 60, price: 500 },
  { name: "Paragliding Tandem Flight", durationMin: 45, price: 2800 },
  { name: "Heritage Village Walk", durationMin: 120, price: 700 },
  { name: "Camping & Bonfire Night", durationMin: 720, price: 2000 },
  { name: "Wildlife Safari", durationMin: 210, price: 2500 },
  { name: "Local Cooking Workshop", durationMin: 150, price: 900 },
];

const PROVIDERS = ["Himalayan Adventures Co.", "Local Trails (govt-certified)", "Peak Experiences", "Valley Outdoors"];

export function mockActivities(destination: string, city: string): Activity[] {
  return [...ACTIVITY_TEMPLATES]
    .map((t, i) => ({ t, r: seededRandom(`${city}-act-${t.name}-${i}`) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 5)
    .map(({ t }, i) => ({
      id: `${city}-act-${i}`.toLowerCase().replace(/\s+/g, "-"),
      name: `${t.name} in ${city}`,
      description: `${t.name} — a top-rated experience around ${city}, run by a reputable local operator.`,
      provider: PROVIDERS[i % PROVIDERS.length],
      durationMin: t.durationMin,
      price: t.price,
      rating: Math.round((4 + seededRandom(`${city}-actr-${i}`)) * 10) / 10,
    }));
}
