import type { StoryPage } from "./types";

// Fill empty photo/ticket slots with deterministic sample images so a template
// PREVIEW shows its real layout populated. Used for the create-flow template grid
// ONLY — never for a real book (slots there stay empty until the user uploads).
// Keyless picsum keeps it dependency-free and stable per seed.
export function withSamplePhotos(page: StoryPage, seedPrefix: string): StoryPage {
  let i = 0;
  return {
    ...page,
    elements: (page.elements ?? []).map((el) => {
      const isMedia = el.type === "photo" || el.type === "ticket";
      const hasUrl = typeof (el.props as Record<string, unknown>)?.url === "string";
      if (!isMedia || hasUrl) return el;
      const url = `https://picsum.photos/seed/${seedPrefix}-${i++}/400/400`;
      return { ...el, props: { ...el.props, url } };
    }),
  };
}
