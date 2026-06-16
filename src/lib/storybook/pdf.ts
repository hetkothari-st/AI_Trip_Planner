import { SIZE_DIMS, type SizePreset } from "./types";

// Minimal structural types so this module typechecks WITHOUT static playwright types (mirrors scrape.ts).
interface MinimalPage {
  setContent(html: string, opts: { waitUntil: string }): Promise<void>;
  pdf(opts: { width: string; height: string; printBackground: boolean }): Promise<Buffer>;
}
interface MinimalBrowser {
  newPage(): Promise<MinimalPage>;
  close(): Promise<void>;
}

/** Render book HTML to a PDF buffer via headless Chromium. Null on any failure. */
export async function htmlToPdf(html: string, sizePreset: SizePreset): Promise<Buffer | null> {
  const dims = SIZE_DIMS[sizePreset];
  let browser: MinimalBrowser | null = null;
  try {
    const pw = (await import("playwright" as any)) as { chromium: { launch(o: unknown): Promise<MinimalBrowser> } }; // eslint-disable-line
    browser = await pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({ width: `${dims.w}px`, height: `${dims.h}px`, printBackground: true });
  } catch (err) {
    console.error("[storybook] pdf render failed:", err);
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
