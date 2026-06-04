/** A price for the same hotel on one booking site (Phase 6 comparison). */
export interface SitePrice {
  site: string; // "MakeMyTrip" | "Goibibo" | ...
  price: number; // per night, INR
  url: string; // deep link to that site's search/listing
  priceSource: "live" | "est"; // was this price scraped live or estimated?
}

export interface Hotel {
  id: string;
  name: string;
  stars: number;
  rating: number; // user rating /5
  pricePerNight: number; // headline (best) price, INR
  currency: string;
  priceSource: "live" | "est"; // provenance of pricePerNight
  priceCheckedAt?: number; // epoch ms when a live price was fetched
  imageUrl: string;
  amenities: string[];
  area: string;
  lat: number;
  lng: number;
  distanceToCenterKm: number; // straight-line distance from the city centre
  // price across the top Indian booking sites, cheapest first
  prices: SitePrice[];
  bestPriceSite: string;
}

export interface HotelSearchParams {
  city: string;
  destination: string;
  budgetMax: number; // per night ceiling, INR
  minStars: number;
  nights: number;
  cityLat?: number; // city centre, to place hotels + measure distances
  cityLng?: number;
}
