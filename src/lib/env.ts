/**
 * Central place to detect which real providers are available. Every feature in the
 * app must work when these are false (mock mode), then transparently upgrade when a
 * key is present. Read on the server only (except the public Mapbox token).
 */
export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  tavilyKey: process.env.TAVILY_API_KEY ?? "",
  braveKey: process.env.BRAVE_API_KEY ?? "",
  youtubeKey: process.env.YOUTUBE_API_KEY ?? "",
  redditId: process.env.REDDIT_CLIENT_ID ?? "",
  redditSecret: process.env.REDDIT_CLIENT_SECRET ?? "",
  unsplashKey: process.env.UNSPLASH_ACCESS_KEY ?? "",
  authSecret: process.env.AUTH_SECRET ?? "",
  googleId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  cloudinaryCloud: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinarySecret: process.env.CLOUDINARY_API_SECRET ?? "",
};

export const hasAnthropic = () => env.anthropicKey.length > 0;
export const hasWebSearch = () => env.tavilyKey.length > 0 || env.braveKey.length > 0;
export const hasYouTube = () => env.youtubeKey.length > 0;
export const hasReddit = () => env.redditId.length > 0 && env.redditSecret.length > 0;
export const hasUnsplash = () => env.unsplashKey.length > 0;
export const hasGoogle = () => env.googleId.length > 0 && env.googleSecret.length > 0;
export const hasCloudinary = () =>
  env.cloudinaryCloud.length > 0 && env.cloudinaryKey.length > 0 && env.cloudinarySecret.length > 0;

// Overpass/Nominatim are keyless; this flag lets us disable real OSM in dev/tests.
export const hasOverpass = () => process.env.DISABLE_OSM !== "1";

// Map tiles (OpenFreeMap) and routing (OSRM) are key-less — no token needed.
