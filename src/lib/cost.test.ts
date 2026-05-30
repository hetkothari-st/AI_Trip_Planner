import { describe, expect, it } from "vitest";
import { computeCost, formatINR } from "./cost";
import type { Hotel } from "@/lib/hotels/types";

const hotel = (price: number): Hotel => ({
  id: "h", name: "Test Inn", stars: 4, rating: 4.2, pricePerNight: price, currency: "INR",
  imageUrl: "", amenities: [], area: "", lat: 30, lng: 79, distanceToCenterKm: 1,
  prices: [], bestPriceSite: "MakeMyTrip",
});

describe("computeCost", () => {
  it("sums hotels (price*nights), activities (*travellers), food per-diem and travel", () => {
    const cost = computeCost({
      places: [{ id: "a", name: "Nainital", days: 2 }],
      hotels: { a: hotel(3000) },
      activities: { a: [{ id: "x", name: "Trek", description: "", provider: "", durationMin: 120, price: 1000, rating: 4.5 }] },
      route: { legs: [], totalDistanceKm: 100, totalDurationSec: 9000, geometry: [], source: "estimate" },
      travellers: 2,
      perDiemFood: 700,
      fuelPerKm: 9,
    });
    expect(cost.byCategory.hotel).toBe(6000); // 3000*2
    expect(cost.byCategory.activity).toBe(2000); // 1000*2
    expect(cost.byCategory.food).toBe(2800); // 700*2days*2pax
    expect(cost.byCategory.travel).toBe(900); // 100*9
    expect(cost.total).toBe(11700);
  });

  it("formats INR with grouping", () => {
    expect(formatINR(11700)).toBe("₹11,700");
  });
});
