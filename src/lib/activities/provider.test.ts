import { describe, expect, it } from "vitest";
import { OverpassActivityProvider } from "./provider";
import type { OsmPoi } from "@/lib/osm/overpass";
import type { Activity } from "@/lib/ai/schemas";

const poi = (over: Partial<OsmPoi>): OsmPoi => ({
  id: "osm-node-7",
  name: "Shivpuri Rafting Point",
  lat: 30.13,
  lng: 78.42,
  tags: { sport: "rafting" },
  ...over,
});

describe("OverpassActivityProvider", () => {
  it("maps OSM leisure/sport POIs to Activities with estimated prices", async () => {
    const provider = new OverpassActivityProvider({
      queryPois: async () => [poi({})],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      llmFallback: async () => [],
    });
    const acts = await provider.search("Uttarakhand", "Rishikesh", 30, 79);
    expect(acts[0]).toMatchObject({ name: "Shivpuri Rafting Point", priceSource: "est" });
    expect(acts[0].price).toBeGreaterThan(0);
    expect(acts[0].lat).toBeCloseTo(30.13);
  });

  it("falls back to the LLM when OSM yields too few activities", async () => {
    const llm: Activity[] = [
      { id: "llm-1", name: "Cooking Class", description: "d", provider: "p", durationMin: 120, price: 900, rating: 4.6, priceSource: "est" },
    ];
    const provider = new OverpassActivityProvider({
      queryPois: async () => [],
      geocodeCity: async () => ({ lat: 30, lng: 79 }),
      llmFallback: async () => llm,
    });
    const acts = await provider.search("Goa", "Panaji", 15, 73);
    expect(acts).toEqual(llm);
  });
});
