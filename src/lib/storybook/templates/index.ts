import type { StoryPage } from "../types";
import { PRESETS } from "./presets";
export { THEMES, getTheme } from "./themes";
export type { Theme } from "./themes";

export interface TemplatePreset {
  id: string;
  name: string;
  themeId: string;
  category: string;
  thumbnail: string;
  pages: StoryPage[];
}

export function listTemplates(): TemplatePreset[] {
  return PRESETS;
}
export function getTemplate(id: string): TemplatePreset | undefined {
  return PRESETS.find((t) => t.id === id);
}
// A blank book seeded from a template = a deep copy of its pages with fresh ids.
export function applyTemplate(preset: TemplatePreset): StoryPage[] {
  return preset.pages.map((p) => ({
    ...p,
    id: `p_${Math.random().toString(36).slice(2)}`,
    elements: p.elements.map((e) => ({ ...e, id: `e_${Math.random().toString(36).slice(2)}` })),
  }));
}
