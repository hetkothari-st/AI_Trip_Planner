import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStorybook } from "./storybook";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })));
  useStorybook.setState({ book: null, dirty: false });
});

const book = {
  id: "b1", userId: "u1", title: "Goa", theme: "polaroid", sizePreset: "square",
  pages: [{ id: "p1", bg: "#fff", elements: [] }], status: "draft",
  createdAt: "2026-06-16T00:00:00Z", updatedAt: "2026-06-16T00:00:00Z",
};

describe("useStorybook", () => {
  it("loads a book", () => {
    useStorybook.getState().setBook(book as any);
    expect(useStorybook.getState().book?.title).toBe("Goa");
  });
  it("adds an element to a page", () => {
    useStorybook.getState().setBook(book as any);
    useStorybook.getState().addElement("p1", { type: "text", x: 5, y: 5, w: 30, h: 10 });
    const els = useStorybook.getState().book!.pages[0].elements;
    expect(els).toHaveLength(1);
    expect(els[0].type).toBe("text");
    expect(useStorybook.getState().dirty).toBe(true);
  });
  it("updates an element", () => {
    useStorybook.getState().setBook(book as any);
    const id = useStorybook.getState().addElement("p1", { type: "text", x: 0, y: 0, w: 10, h: 10 });
    useStorybook.getState().updateElement("p1", id, { x: 50 });
    expect(useStorybook.getState().book!.pages[0].elements[0].x).toBe(50);
  });
  it("removes an element", () => {
    useStorybook.getState().setBook(book as any);
    const id = useStorybook.getState().addElement("p1", { type: "text", x: 0, y: 0, w: 10, h: 10 });
    useStorybook.getState().removeElement("p1", id);
    expect(useStorybook.getState().book!.pages[0].elements).toHaveLength(0);
  });
  it("adds and removes pages", () => {
    useStorybook.getState().setBook(book as any);
    useStorybook.getState().addPage();
    expect(useStorybook.getState().book!.pages).toHaveLength(2);
    useStorybook.getState().removePage(useStorybook.getState().book!.pages[1].id);
    expect(useStorybook.getState().book!.pages).toHaveLength(1);
  });
});
