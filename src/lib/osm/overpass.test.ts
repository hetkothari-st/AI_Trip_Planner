import { afterEach, describe, expect, it, vi } from "vitest";
import { bboxAround, parseElements, queryPois } from "./overpass";

afterEach(() => vi.unstubAllGlobals());

describe("bboxAround", () => {
  it("returns [south, west, north, east] spanning the radius", () => {
    const [s, w, n, e] = bboxAround(30, 79, 5);
    expect(s).toBeLessThan(30);
    expect(n).toBeGreaterThan(30);
    expect(w).toBeLessThan(79);
    expect(e).toBeGreaterThan(79);
  });
});

describe("parseElements", () => {
  it("maps nodes and ways (with center) to OsmPoi, skipping nameless", () => {
    const pois = parseElements({
      elements: [
        { type: "node", id: 1, lat: 30.1, lon: 79.1, tags: { name: "A", tourism: "hotel" } },
        { type: "way", id: 2, center: { lat: 30.2, lon: 79.2 }, tags: { name: "B" } },
        { type: "node", id: 3, lat: 30.3, lon: 79.3, tags: { tourism: "hotel" } },
      ],
    });
    expect(pois).toHaveLength(2);
    expect(pois[0]).toEqual({ id: "osm-node-1", name: "A", lat: 30.1, lng: 79.1, tags: { name: "A", tourism: "hotel" } });
    expect(pois[1].id).toBe("osm-way-2");
  });
});

describe("queryPois", () => {
  it("POSTs Overpass QL and returns parsed POIs", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ elements: [{ type: "node", id: 9, lat: 1, lon: 2, tags: { name: "Z" } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pois = await queryPois(bboxAround(30, 79, 5), ['node["tourism"="hotel"]']);
    expect(pois[0].name).toBe("Z");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns [] on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 504 })));
    expect(await queryPois(bboxAround(30, 79, 5), ['node["tourism"="hotel"]'])).toEqual([]);
  });
});
