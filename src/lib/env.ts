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
};

export const hasAnthropic = () => env.anthropicKey.length > 0;
export const hasWebSearch = () => env.tavilyKey.length > 0 || env.braveKey.length > 0;
export const hasYouTube = () => env.youtubeKey.length > 0;
export const hasReddit = () => env.redditId.length > 0 && env.redditSecret.length > 0;
export const hasUnsplash = () => env.unsplashKey.length > 0;

/** The Mapbox token is public by design (used in the browser). */
export const mapboxToken = () => process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
export const hasMapbox = () => mapboxToken().length > 0;
