import { z } from "zod";

export const ElementTypeSchema = z.enum(["photo", "text", "ticket", "sticker", "shape"]);
export type ElementType = z.infer<typeof ElementTypeSchema>;

const pct = z.number().min(0).max(100);

// Photo + ticket share the same media props. url/publicId absent => empty upload slot.
export const PhotoPropsSchema = z.object({
  url: z.string().url().optional(),
  publicId: z.string().optional(),
  fit: z.enum(["cover", "contain"]).default("cover"),
  caption: z.string().max(200).optional(),
});
export const TextPropsSchema = z.object({
  text: z.string().default(""),
  fontId: z.string().default("body"),
  size: z.number().min(6).max(200).default(16),
  color: z.string().default("#1a1a1a"),
  align: z.enum(["left", "center", "right"]).default("left"),
});
export const ShapePropsSchema = z.object({
  kind: z.string().default("rect"),
  color: z.string().default("#ffcc00"),
});

export const StoryElementSchema = z.object({
  id: z.string(),
  type: ElementTypeSchema,
  x: pct, y: pct, w: pct, h: pct,
  rotation: z.number().default(0),
  z: z.number().int().default(0),
  props: z.record(z.unknown()).default({}),
});
export type StoryElement = z.infer<typeof StoryElementSchema>;

export const StoryPageSchema = z.object({
  id: z.string(),
  bg: z.string().default("#ffffff"),
  elements: z.array(StoryElementSchema).default([]),
});
export type StoryPage = z.infer<typeof StoryPageSchema>;

export const SizePresetSchema = z.enum(["square", "a4-portrait", "landscape"]);
export type SizePreset = z.infer<typeof SizePresetSchema>;

export const StorybookSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(120),
  tripId: z.string().optional(),
  theme: z.string(),
  sizePreset: SizePresetSchema.default("square"),
  coverUrl: z.string().optional(),
  pages: z.array(StoryPageSchema).default([]),
  status: z.enum(["draft", "ready"]).default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Storybook = z.infer<typeof StorybookSchema>;

// Body the client PUTs to save edits (no server-owned fields).
export const StorybookSaveSchema = StorybookSchema.pick({
  title: true, theme: true, sizePreset: true, coverUrl: true, pages: true, status: true,
}).partial({ coverUrl: true, status: true });
export type StorybookSave = z.infer<typeof StorybookSaveSchema>;

// Pixel dimensions per size preset (used by canvas + PDF).
export const SIZE_DIMS: Record<SizePreset, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  "a4-portrait": { w: 794, h: 1123 },
  landscape: { w: 1280, h: 720 },
};
