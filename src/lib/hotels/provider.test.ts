import { afterEach, describe, expect, it, vi } from "vitest";
import { OverpassHotelProvider } from "./provider";
import type { OsmPoi } from "@/lib/osm/overpass";

afterEach(() => vi.restoreAllMocks());

const poi = (over: Partial<OsmPoi>): OsmPoi => ({
  id: "osm-node-1",
  name: "Pine Retreat",
  lat: 30.1,
  lng: 79.05,
  tags: { tourism: "hotel", stars: "4", internet_access: "wlan" },
  ...over,
});

describe("OverpassHotelProvider", () => {
  it("maps OSM POIs to Hotels, reading stars + amenities from tags", async () => {
    const provider = new OverpassHotelProvider({
      queryPois: async () => [poi({})],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      imageFor: async () => "http://img/a.jpg",
    });
    const hotels = await provider.search({
      city: "Rishikesh",
      destination: "Uttarakhand",
      budgetMax: 20000,
      minStars: 1,
      nights: 2,
    });
    expect(hotels).toHaveLength(1);
    expect(hotels[0]).toMatchObject({ name: "Pine Retreat", stars: 4, currency: "INR", priceSource: "est" });
    expect(hotels[0].amenities).toContain("Free Wi-Fi");
    expect(hotels[0].prices.length).toBeGreaterThan(0);
    expect(hotels[0].imageUrl).toBe("http://img/a.jpg");
  });

  it("filters out hotels below minStars and above budget, cheapest first", async () => {
    const provider = new OverpassHotelProvider({
      queryPois: async () => [
        poi({ id: "osm-node-1", name: "Budget", tags: { tourism: "hotel", stars: "2" } }),
        poi({ id: "osm-node-2", name: "Posh", tags: { tourism: "hotel", stars: "5" } }),
      ],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      imageFor: async () => "http://img/x.jpg",
    });
    const hotels = await provider.search({
      city: "Rishikesh",
      destination: "Uttarakhand",
      budgetMax: 100000,
      minStars: 3,
      nights: 1,
    });
    expect(hotels.map((h) => h.name)).toEqual(["Posh"]);
  });

  it("returns [] when geocode and supplied coords are both missing", async () => {
    const provider = new OverpassHotelProvider({
      queryPois: async () => [poi({})],
      geocodeCity: async () => null,
      imageFor: async () => "x",
    });
    const hotels = await provider.search({
      city: "Nowhere",
      destination: "Nowhere",
      budgetMax: 20000,
      minStars: 1,
      nights: 1,
    });
    expect(hotels).toEqual([]);
  });
});
