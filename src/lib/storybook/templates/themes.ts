export interface Theme {
  id: string;
  name: string;
  // paper: light surface for writing panels / card chrome.
  // bg:    the page background (often colored — that's what gives a theme its mood).
  // ink:   primary text color, chosen to read on `bg`.
  // accent / accent2: decorative pops (bars, blocks, dots, perforations).
  palette: { paper: string; bg: string; ink: string; accent: string; accent2: string };
  fonts: { display: string; body: string };
  frameStyle: "none" | "polaroid" | "kraft" | "postcard" | "ticket" | "editorial";
  paperTexture?: string;
}

export const THEMES: Record<string, Theme> = {
  "vintage-kraft": {
    id: "vintage-kraft", name: "Vintage Kraft",
    palette: { paper: "#efe2c8", bg: "#c79a5b", ink: "#3a2410", accent: "#b5391f", accent2: "#e0a02e" },
    fonts: { display: "'Space Grotesk', serif", body: "Georgia, serif" }, frameStyle: "kraft",
  },
  "clean-editorial": {
    id: "clean-editorial", name: "Clean Editorial",
    palette: { paper: "#ffffff", bg: "#eef2f8", ink: "#101114", accent: "#0050ff", accent2: "#ff4d4d" },
    fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "editorial",
  },
  "film-polaroid": {
    id: "film-polaroid", name: "Film / Polaroid",
    palette: { paper: "#ffffff", bg: "#2b2b2e", ink: "#f3f1ea", accent: "#e63b2e", accent2: "#f4c20d" },
    fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "polaroid",
  },
  postcard: {
    id: "postcard", name: "Postcard",
    palette: { paper: "#fffdf3", bg: "#0e7c66", ink: "#fff8e7", accent: "#ffcf5c", accent2: "#e8552d" },
    fonts: { display: "'Space Grotesk', serif", body: "Georgia, serif" }, frameStyle: "postcard",
  },
  "boarding-pass": {
    id: "boarding-pass", name: "Boarding Pass",
    palette: { paper: "#eef2fb", bg: "#11317a", ink: "#ffffff", accent: "#ffd400", accent2: "#3aa0ff" },
    fonts: { display: "'Space Grotesk', monospace", body: "monospace" }, frameStyle: "ticket",
  },
  bauhaus: {
    id: "bauhaus", name: "Bauhaus",
    palette: { paper: "#f7f1e2", bg: "#f0e6cf", ink: "#141414", accent: "#e63b2e", accent2: "#1356c4" },
    fonts: { display: "'Space Grotesk', sans-serif", body: "Inter, sans-serif" }, frameStyle: "none",
  },
};

export function getTheme(id: string): Theme {
  return THEMES[id] ?? THEMES["clean-editorial"];
}
