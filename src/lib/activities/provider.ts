import { bboxAround, queryPois as realQueryPois, type OsmPoi } from "@/lib/osm/overpass";
import { geocodeCity as realGeocodeCity } from "@/lib/osm/geocode";
import { recommendActivities } from "@/lib/ai";
import { estimateActivityPrice } from "@/lib/pricing/estimate";
import { seededRandom } from "@/lib/utils";
import type { Activity } from "@/lib/ai/schemas";

// OSM selectors that tend to map to "do an activity here" spots.
const ACTIVITY_SELECTORS = [
  'node["sport"~"rafting|paragliding|climbing|canoe|skiing"]',
  'node["leisure"~"park|water_park|nature_reserve|sports_centre"]',
  'node["tourism"~"theme_park|zoo|aquarium|viewpoint"]',
];

function durationFor(tags: Record<string, string>): number {
  if (/rafting|paraglid|climb/.test(JSON.stringify(tags))) return 180;
  if (tags.tourism === "viewpoint") return 45;
  return 120;
}

export interface ActivityDeps {
  queryPois: typeof realQueryPois;
  geocodeCity: typeof realGeocodeCity;
  llmFallback: (destination: string, city: string, lat?: number, lng?: number) => Promise<Activity[]>;
}

export class OverpassActivityProvider {
  readonly name = "overpass";
  constructor(
    private deps: ActivityDeps = {
      queryPois: realQueryPois,
      geocodeCity: realGeocodeCity,
      llmFallback: recommendActivities,
    },
  ) {}

  async search(destination: string, city: string, cityLat?: number, cityLng?: number): Promise<Activity[]> {
    const center =
      cityLat != null && cityLng != null
        ? { lat: cityLat, lng: cityLng }
        : await this.deps.geocodeCity(city, destination);

    if (center) {
      const pois = await this.deps.queryPois(bboxAround(center.lat, center.lng, 15), ACTIVITY_SELECTORS);
      const acts = pois.slice(0, 8).map((p) => this.toActivity(p));
      if (acts.length > 0) return acts;
    }
    // No real activities (or no centre) → LLM-generated.
    return this.deps.llmFallback(destination, city, cityLat, cityLng);
  }

  private toActivity(p: OsmPoi): Activity {
    const category = p.tags.sport || p.tags.leisure || p.tags.tourism || "activity";
    const durationMin = durationFor(p.tags);
    return {
      id: p.id,
      name: p.name,
      description: `${p.name} — ${category.replace(/_/g, " ")} near you. Book locally on arrival.`,
      provider: "Local operators",
      durationMin,
      price: estimateActivityPrice(p.name, category, durationMin),
      rating: Math.round((4 + seededRandom(`actr-${p.id}`)) * 10) / 10,
      priceSource: "est",
      lat: p.lat,
      lng: p.lng,
    };
  }
}

let cached: OverpassActivityProvider | null = null;
export function getActivityProvider(): OverpassActivityProvider {
  if (!cached) cached = new OverpassActivityProvider();
  return cached;
}
