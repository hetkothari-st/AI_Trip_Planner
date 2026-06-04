// Best-effort price scraping. The PARSER is pure + tested. The Playwright launcher is
// integration-only (no unit test) and returns null on ANY failure so callers fall back.

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Pull the first plausible INR amount (300..200000) out of arbitrary page text. */
export function parsePriceFromText(text: string): number | null {
  const re = /₹\s?(\d[\d,]{2,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 300 && n <= 200000) return n;
  }
  return null;
}

function searchUrl(name: string, city: string): string {
  const q = encodeURIComponent(`${name} ${city}`);
  return `https://www.makemytrip.com/hotels/hotel-listing/?searchText=${q}`;
}

// Minimal structural types so this module typechecks WITHOUT the playwright package
// installed (it is added in a later task; here we only reference it via dynamic import).
interface MinimalPage {
  goto(url: string, opts: { timeout: number; waitUntil: string }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  content(): Promise<string>;
}
interface MinimalBrowser {
  newPage(opts: { userAgent: string }): Promise<MinimalPage>;
  close(): Promise<void>;
}

/**
 * Launch headless Chromium, open a booking search, and scrape the first listed price.
 * Returns null on timeout / block / any error. Bounded: one launch per call, 6s nav cap.
 * Not unit-tested (live + non-deterministic); the parser above is the tested part.
 */
export async function scrapePrice(args: { name: string; city: string; kind: "hotel" | "activity" }): Promise<number | null> {
  // Activities have no reliable price page — skip scraping, force estimate fallback.
  if (args.kind === "activity") return null;

  let browser: MinimalBrowser | null = null;
  try {
    const pw = (await import("playwright" as any)) as { chromium: { launch(opts: unknown): Promise<MinimalBrowser> } }; // eslint-disable-line
    browser = await pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const page = await browser.newPage({ userAgent: DESKTOP_UA });
    await page.goto(searchUrl(args.name, args.city), { timeout: 6000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const html = await page.content();
    return parsePriceFromText(html);
  } catch (err) {
    console.error(`[pricing] scrape "${args.name}" failed:`, err);
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
