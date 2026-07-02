/**
 * Tier-3 fallback: render the page in a real browser and return its HTML, for
 * sites that expose no OG/JSON-LD metadata and have no store parser.
 *
 * STUB — intentionally not wired to a browser yet. It returns null so the
 * pipeline degrades gracefully: Tiers 1-2 (metadata + store parsers) still
 * work, and headless is simply skipped.
 *
 * To implement, pick one and fetch the rendered HTML here:
 *   - Self-hosted: puppeteer-core + @sparticuz/chromium (mind serverless size).
 *   - Hosted:      Browserbase / browserless.io (paid per session).
 * scrapeProduct re-runs the metadata extractor on whatever HTML you return.
 */
export async function renderWithHeadlessBrowser(_url: string): Promise<string | null> {
  return null;
}
