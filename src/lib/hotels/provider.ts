import { haversineKm, seededRandom } from "@/lib/utils";
import { BOOKING_SITES, deepLink } from "./deepLinks";
import type { Hotel, HotelSearchParams, SitePrice } from "./types";
import { bboxAround, queryPois as realQueryPois, type OsmPoi } from "@/lib/osm/overpass";
import { geocodeCity as realGeocodeCity } from "@/lib/osm/geocode";
import { getImage } from "@/lib/images";
import { estimateHotelPrice } from "@/lib/pricing/estimate";
import { hasOverpass } from "@/lib/env";

// Approximate how far each "area" sits from the city centre, in km.
const AREA_OFFSET_KM: Record<string, number> = {
  "City Center": 0.4,
  "Mall Road": 0.9,
  "Old Town": 1.6,
  Lakeside: 2.2,
  Hillside: 3.2,
};

/**
 * Hotel data provider. A real Amadeus provider would slot in here behind the same
 * interface; until keys exist we serve deterministic mock listings so the full flow
 * (filter -> compare prices -> pick best -> feed cost calculator) works end to end.
 */
export interface HotelProvider {
  readonly name: string;
  search(params: HotelSearchParams): Promise<Hotel[]>;
}

const AMENITY_POOL = [
  "Free Wi-Fi", "Breakfast included", "Parking", "Mountain view", "Restaurant",
  "Room heater", "Power backup", "Pet friendly", "Spa", "Bonfire", "Pool", "Airport pickup",
];

const NAME_PREFIX = ["The", "Hotel", "Royal", "Himalayan", "Pine", "Snow View", "Whispering"];
const NAME_SUFFIX = ["Residency", "Retreat", "Grand", "Inn", "Cottages", "Resort & Spa", "Heights", "Manor"];

class MockHotelProvider implements HotelProvider {
  readonly name = "mock";

  async search(params: HotelSearchParams): Promise<Hotel[]> {
    const { city, budgetMax, minStars, cityLat, cityLng } = params;
    // Fall back to a plausible Himalayan centre if the caller didn't pass city coords.
    const center = { lat: cityLat ?? 30.0, lng: cityLng ?? 79.0 };
    const out: Hotel[] = [];
    for (let i = 0; i < 8; i++) {
      const r = (k: string) => seededRandom(`${city}-${i}-${k}`);
      const stars = 3 + Math.floor(r("stars") * 3); // 3..5
      if (stars < minStars) continue;

      // Place the hotel around the city centre, offset by its area type in a seeded
      // direction; 1° lat ≈ 111 km, so convert km → degrees for the jitter.
      const area = ["City Center", "Mall Road", "Lakeside", "Hillside", "Old Town"][i % 5];
      const offsetKm = AREA_OFFSET_KM[area] ?? 1;
      const bearing = r("bearing") * 2 * Math.PI;
      const lat = center.lat + (offsetKm / 111) * Math.cos(bearing);
      const lng = center.lng + (offsetKm / (111 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(bearing);
      const distanceToCenterKm = haversineKm(center, { lat, lng });

      // base price scales with stars, capped to the budget
      const base = Math.round((1500 + stars * 1200 + r("price") * 1800) / 50) * 50;
      const headline = Math.min(base, budgetMax);

      // per-site prices spread around the headline; cheapest defines the best site
      const prices: SitePrice[] = BOOKING_SITES.map((site, si) => ({
        site,
        price: Math.round((headline * (1 + (r(`site${si}`) - 0.4) * 0.18)) / 10) * 10,
        url: deepLink(site, `${NAME_PREFIX[i % NAME_PREFIX.length]} ${city} ${NAME_SUFFIX[i % NAME_SUFFIX.length]}`, city),
        priceSource: "est" as const,
      })).sort((a, b) => a.price - b.price);

      const amenities = AMENITY_POOL.filter((_, ai) => r(`am${ai}`) > 0.5).slice(0, 6);
      if (amenities.length < 3) amenities.push("Free Wi-Fi", "Parking", "Restaurant");

      out.push({
        id: `${city}-hotel-${i}`.toLowerCase().replace(/\s+/g, "-"),
        name: `${NAME_PREFIX[i % NAME_PREFIX.length]} ${city} ${NAME_SUFFIX[i % NAME_SUFFIX.length]}`,
        stars,
        rating: Math.round((3.6 + r("rating") * 1.4) * 10) / 10,
        pricePerNight: prices[0].price,
        currency: "INR",
        priceSource: "est" as const,
        imageUrl: `https://picsum.photos/seed/${city}-hotel-${i}/640/400`,
        amenities: Array.from(new Set(amenities)),
        area,
        lat,
        lng,
        distanceToCenterKm,
        prices,
        bestPriceSite: prices[0].site,
      });
    }
    // cheapest first, within budget
    return out
      .filter((h) => h.pricePerNight <= budgetMax)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);
  }
}

// OSM tag → human amenity label. Only tags we can trust as present.
const AMENITY_TAGS: { test: (t: Record<string, string>) => boolean; label: string }[] = [
  { test: (t) => t.internet_access === "wlan" || t.internet_access === "yes" || t["internet_access:fee"] === "no", label: "Free Wi-Fi" },
  { test: (t) => t.swimming_pool === "yes" || t.leisure === "swimming_pool", label: "Pool" },
  { test: (t) => t.parking === "yes" || t.amenity === "parking", label: "Parking" },
  { test: (t) => t.air_conditioning === "yes", label: "Air conditioning" },
  { test: (t) => t.restaurant === "yes" || t.amenity === "restaurant", label: "Restaurant" },
  { test: (t) => t.breakfast === "yes" || t.breakfast === "included", label: "Breakfast included" },
  { test: (t) => t.wheelchair === "yes", label: "Wheelchair access" },
  { test: (t) => t.pet === "yes" || t.dog === "yes", label: "Pet friendly" },
];

function starsFromTags(tags: Record<string, string>): number {
  const raw = Number(tags.stars);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 5) return Math.round(raw);
  if (tags.tourism === "hostel") return 2;
  if (tags.tourism === "guest_house") return 3;
  return 3; // unrated hotel
}

function areaFromTags(tags: Record<string, string>): string {
  return tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:city"] || "City Centre";
}

/** Dependencies are injectable so the provider is unit-testable without network. */
export interface OverpassDeps {
  queryPois: typeof realQueryPois;
  geocodeCity: typeof realGeocodeCity;
  imageFor: (name: string) => Promise<string>;
}

export class OverpassHotelProvider implements HotelProvider {
  readonly name = "overpass";
  constructor(
    private deps: OverpassDeps = {
      queryPois: realQueryPois,
      geocodeCity: realGeocodeCity,
      imageFor: async (name) => (await getImage(name)).url,
    },
  ) {}

  async search(params: HotelSearchParams): Promise<Hotel[]> {
    const { city, destination, budgetMax, minStars, cityLat, cityLng } = params;
    const center =
      cityLat != null && cityLng != null
        ? { lat: cityLat, lng: cityLng }
        : await this.deps.geocodeCity(city, destination);
    if (!center) return [];

    const pois = await this.deps.queryPois(bboxAround(center.lat, center.lng, 6), [
      'node["tourism"~"hotel|guest_house|hostel"]',
      'way["tourism"~"hotel|guest_house|hostel"]',
    ]);

    const hotels = await Promise.all(
      pois.slice(0, 12).map((p) => this.toHotel(p, center, city, budgetMax)),
    );

    return hotels
      .filter((h): h is Hotel => h !== null && h.stars >= minStars && h.pricePerNight <= budgetMax)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);
  }

  private async toHotel(
    p: OsmPoi,
    center: { lat: number; lng: number },
    city: string,
    budgetMax: number,
  ): Promise<Hotel | null> {
    const stars = starsFromTags(p.tags);
    const estimate = Math.min(estimateHotelPrice(p.name, stars), budgetMax);
    const amenities = AMENITY_TAGS.filter((a) => a.test(p.tags)).map((a) => a.label);
    if (amenities.length < 2) amenities.push("Free Wi-Fi", "Parking");

    const prices: SitePrice[] = BOOKING_SITES.map((site) => ({
      site,
      price: estimate,
      url: deepLink(site, p.name, city),
      priceSource: "est" as const,
    }));

    return {
      id: p.id,
      name: p.name,
      stars,
      rating: Math.round((3.5 + (stars - 3) * 0.4) * 10) / 10,
      pricePerNight: estimate,
      currency: "INR",
      priceSource: "est",
      imageUrl: await this.deps.imageFor(`${p.name} ${city}`),
      amenities: Array.from(new Set(amenities)).slice(0, 6),
      area: areaFromTags(p.tags),
      lat: p.lat,
      lng: p.lng,
      distanceToCenterKm: haversineKm(center, { lat: p.lat, lng: p.lng }),
      prices,
      bestPriceSite: prices[0].site,
    };
  }
}

/** Wrapper: try the real provider, fall back to mock if it yields nothing. */
class FallbackHotelProvider implements HotelProvider {
  readonly name = "overpass+mock";
  private real = new OverpassHotelProvider();
  private mock = new MockHotelProvider();
  async search(params: HotelSearchParams): Promise<Hotel[]> {
    const real = await this.real.search(params).catch(() => []);
    return real.length > 0 ? real : this.mock.search(params);
  }
}

let cached: HotelProvider | null = null;

export function getHotelProvider(): HotelProvider {
  if (cached) return cached;
  cached = hasOverpass() ? new FallbackHotelProvider() : new MockHotelProvider();
  return cached;
}
