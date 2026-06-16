import { describe, it, expect } from "vitest";
import { StoryPageSchema, StorybookSchema, PhotoPropsSchema } from "./types";

const photoEl = {
  id: "e1", type: "photo", x: 10, y: 10, w: 40, h: 30, rotation: 0, z: 1,
  props: { url: "https://x/y.jpg", publicId: "y", fit: "cover" },
};
const page = { id: "p1", bg: "#fff", elements: [photoEl] };

describe("storybook schema", () => {
  it("accepts a valid page", () => {
    expect(StoryPageSchema.parse(page)).toMatchObject({ id: "p1" });
  });
  it("rejects element coords outside 0..100", () => {
    expect(() => StoryPageSchema.parse({ ...page, elements: [{ ...photoEl, x: 140 }] })).toThrow();
  });
  it("rejects unknown element type", () => {
    expect(() => StoryPageSchema.parse({ ...page, elements: [{ ...photoEl, type: "video" }] })).toThrow();
  });
  it("validates photo props (url required when present)", () => {
    expect(PhotoPropsSchema.parse({ fit: "cover" })).toMatchObject({ fit: "cover" });
    expect(() => PhotoPropsSchema.parse({ url: 123 })).toThrow();
  });
  it("accepts a full storybook", () => {
    const book = {
      id: "b1", userId: "u1", title: "Goa", theme: "polaroid",
      sizePreset: "square", pages: [page], status: "draft",
      createdAt: "2026-06-16T00:00:00Z", updatedAt: "2026-06-16T00:00:00Z",
    };
    expect(StorybookSchema.parse(book).title).toBe("Goa");
  });
});
