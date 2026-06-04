import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeCity } from "./geocode";

afterEach(() => vi.unstubAllGlobals());

describe("geocodeCity", () => {
  it("returns the first hit's lat/lng as numbers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify([{ lat: "30.0869", lon: "78.2676" }]), { status: 200 }),
    ));
    expect(await geocodeCity("Rishikesh", "Uttarakhand")).toEqual({ lat: 30.0869, lng: 78.2676 });
  });

  it("returns null when there are no hits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { status: 200 })));
    expect(await geocodeCity("Nowhereville", "Nowhere")).toBeNull();
  });

  it("returns null on a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 500 })));
    expect(await geocodeCity("X", "Y")).toBeNull();
  });
});
