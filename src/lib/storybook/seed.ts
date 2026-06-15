import type { StoryPage } from "./types";
export function blankPages(): StoryPage[] {
  return [{ id: `p_${Math.random().toString(36).slice(2)}`, bg: "#ffffff", elements: [] }];
}
