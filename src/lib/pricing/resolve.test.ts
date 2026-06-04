import { describe, expect, it, vi } from "vitest";
import { resolvePrice } from "./resolve";

describe("resolvePrice", () => {
  it("returns a live price when the scraper finds one", async () => {
    const r = await resolvePrice({
      key: "live-1",
      name: "Hotel A",
      city: "Rishikesh",
      kind: "hotel",
      estimate: () => 9999,
      scrape: async () => 3500,
    });
    expect(r).toMatchObject({ price: 3500, priceSource: "live" });
    expect(typeof r.priceCheckedAt).toBe("number");
  });

  it("falls back to the estimate when the scraper returns null", async () => {
    const r = await resolvePrice({
      key: "est-1",
      name: "Hotel B",
      city: "Nainital",
      kind: "hotel",
      estimate: () => 4200,
      scrape: async () => null,
    });
    expect(r).toMatchObject({ price: 4200, priceSource: "est" });
  });

  it("falls back to the estimate when the scraper throws", async () => {
    const r = await resolvePrice({
      key: "throw-1",
      name: "Hotel C",
      city: "Mussoorie",
      kind: "hotel",
      estimate: () => 5000,
      scrape: async () => {
        throw new Error("blocked");
      },
    });
    expect(r.priceSource).toBe("est");
    expect(r.price).toBe(5000);
  });

  it("caches the first result for a key (scraper called once, same value returned)", async () => {
    const scrape = vi.fn(async () => 1500);
    const args = { key: "cache-1", name: "H", city: "C", kind: "hotel" as const, estimate: () => 1, scrape };
    const r1 = await resolvePrice(args);
    const r2 = await resolvePrice(args);
    expect(scrape).toHaveBeenCalledOnce();
    expect(r2).toEqual(r1);
    expect(r2).toMatchObject({ price: 1500, priceSource: "live" });
  });
});
