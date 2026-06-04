import { haversineKm, seededRandom } from "@/lib/utils";
import { BOOKING_SITES, deepLink } from "./deepLinks";
import type { Hotel, HotelSearchParams, SitePrice } from "./types";

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

let cached: HotelProvider | null = null;

export function getHotelProvider(): HotelProvider {
  // Amadeus provider would be selected here when AMADEUS_CLIENT_ID/SECRET are set.
  if (!cached) cached = new MockHotelProvider();
  return cached;
}
