export interface Theme {
  id: string;
  name: string;
  palette: { paper: string; ink: string; accent: string };
  fonts: { display: string; body: string };
  frameStyle: "none" | "polaroid" | "kraft" | "postcard" | "ticket" | "editorial";
  paperTexture?: string; // optional CSS background
}

export const THEMES: Record<string, Theme> = {
  "vintage-kraft": { id: "vintage-kraft", name: "Vintage Kraft", palette: { paper: "#d8c3a5", ink: "#3a2e1f", accent: "#a8412c" }, fonts: { display: "'Space Grotesk', serif", body: "Georgia, serif" }, frameStyle: "kraft" },
  "clean-editorial": { id: "clean-editorial", name: "Clean Editorial", palette: { paper: "#faf8f4", ink: "#1a1a1a", accent: "#0055ff" }, fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "editorial" },
  "film-polaroid": { id: "film-polaroid", name: "Film / Polaroid", palette: { paper: "#f4f1ea", ink: "#222", accent: "#e63b2e" }, fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "polaroid" },
  postcard: { id: "postcard", name: "Postcard", palette: { paper: "#fffdf7", ink: "#2b2b2b", accent: "#0a7d6b" }, fonts: { display: "'Space Grotesk', serif", body: "Georgia, serif" }, frameStyle: "postcard" },
  "boarding-pass": { id: "boarding-pass", name: "Boarding Pass", palette: { paper: "#f7f7f7", ink: "#101010", accent: "#0055ff" }, fonts: { display: "'Space Grotesk', monospace", body: "monospace" }, frameStyle: "ticket" },
  bauhaus: { id: "bauhaus", name: "Bauhaus", palette: { paper: "#f5f0e8", ink: "#1a1a1a", accent: "#ffcc00" }, fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "none" },
};

export function getTheme(id: string): Theme {
  return THEMES[id] ?? THEMES["clean-editorial"];
}
