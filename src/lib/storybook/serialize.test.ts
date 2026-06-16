import { describe, it, expect } from "vitest";
import { bookToHtml } from "./serialize";

const book = {
  id: "b1", userId: "u1", title: "Goa", theme: "film-polaroid", sizePreset: "square",
  pages: [
    { id: "p1", bg: "#fff", elements: [
      { id: "e1", type: "photo", x: 0, y: 0, w: 50, h: 50, rotation: 0, z: 1, props: { url: "https://x/a.jpg", fit: "cover" } },
      { id: "e2", type: "text", x: 10, y: 60, w: 80, h: 20, rotation: 0, z: 2, props: { text: "Hi <b>", size: 20 } },
    ] },
    { id: "p2", bg: "#eee", elements: [] },
  ],
  status: "draft", createdAt: "", updatedAt: "",
} as any;

describe("bookToHtml", () => {
  const html = bookToHtml(book);
  it("emits one page section per page", () => {
    expect(html.match(/class="page"/g)?.length).toBe(2);
  });
  it("includes page-break between pages", () => {
    expect(html).toContain("page-break-after");
  });
  it("includes the photo url", () => {
    expect(html).toContain("https://x/a.jpg");
  });
  it("escapes text content", () => {
    expect(html).toContain("Hi &lt;b&gt;");
    expect(html).not.toContain("Hi <b>");
  });
  it("positions elements in percent", () => {
    expect(html).toMatch(/left:\s?0%/);
    expect(html).toMatch(/width:\s?50%/);
  });
});
