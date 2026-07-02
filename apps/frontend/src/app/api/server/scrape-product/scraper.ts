import { extractGenericProduct } from "./helpers/generic";
import { renderWithHeadlessBrowser } from "./helpers/headless";
import { getStoreScraper } from "./helpers/stores";
import {
  type AsyncScraperMethod,
  type ScraperMethod,
  type ProductData,
  emptyProduct,
} from "./helpers/types";
import { isSafeUrl } from "./helpers/validate-url";

export type { ProductData };

// A complete, modern desktop UA. We fetch a single page on demand with this so
// we read like a normal browser / link-preview bot, not a scraper.
const FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
};

/** Enough to render a useful preview: a name and a price. */
function hasCoreData(product: ProductData): boolean {
  return Boolean(product.title && product.price);
}

function hasAnyData(product: ProductData): boolean {
  return Boolean(product.title || product.description || product.image || product.price);
}

/** Fill empty fields of `target` from `source`; never overwrites existing values. */
function fillGaps(target: ProductData, source: ProductData): void {
  if (!target.title && source.title) target.title = source.title;
  if (!target.description && source.description) target.description = source.description;
  if (!target.image && source.image) target.image = source.image;
  if (!target.price && source.price) target.price = source.price;
  if (!target.discount_price && source.discount_price) target.discount_price = source.discount_price;
  if (!target.has_discount && source.has_discount) target.has_discount = source.has_discount;
  if (!target.discount_end_date && source.discount_end_date)
    target.discount_end_date = source.discount_end_date;
  if (!target.currency && source.currency) target.currency = source.currency;
}

/** Fetch a page's HTML with a browser-like UA, handling the JS cookie challenge. */
async function fetchHtml(url: string): Promise<string | null> {
  let response = await fetch(url, { headers: FETCH_HEADERS });
  if (!response.ok) return null;

  let html = await response.text();

  const challengeMatch = html.match(/const\s+defaultHash\s*=\s*"([a-f0-9]{64})"/);
  if (challengeMatch && html.length < 1000 && html.includes("challenge_passed")) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    const cookiePairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
    cookiePairs.push(`challenge_passed=${challengeMatch[1]}`);

    response = await fetch(url, {
      headers: { ...FETCH_HEADERS, Cookie: cookiePairs.join("; ") },
    });
    if (!response.ok) return null;
    html = await response.text();
  }

  return html;
}

/** Run the store-specific parser for this domain, if one is registered. */
async function runStoreScraper(url: string, html: string): Promise<ProductData | null> {
  const storeEntry = getStoreScraper(url);
  if (!storeEntry) return null;

  try {
    return storeEntry.async
      ? await (storeEntry.scraper as AsyncScraperMethod)(html, url)
      : (storeEntry.scraper as ScraperMethod)(html, url);
  } catch (error) {
    console.error("Store scraper failed:", error);
    return null;
  }
}

/** Normalize the assembled product; drop it entirely if nothing was found. */
function finalizeProduct(product: ProductData, url: string): ProductData | null {
  if (product.discount_price && !product.price) {
    product.price = product.discount_price;
  }

  if (product.image && !product.image.startsWith("http")) {
    try {
      product.image = new URL(product.image, url).href;
    } catch {
      // Leave as-is if URL parsing fails.
    }
  }

  return hasAnyData(product) ? product : null;
}

/**
 * Metadata-first product scraper.
 *
 *   Tier 1  OG / JSON-LD metadata (metascraper + generic extractors)
 *   Tier 2  store-specific parser  — only when metadata lacks a price
 *   Tier 3  headless render        — only when metadata is absent (stubbed)
 *
 * The page is fetched once, on demand, with a browser-like User-Agent. Reading
 * metadata (what link-preview bots read) is the ban-resistant default; the
 * expensive/detectable headless path is a genuine last resort.
 */
export async function scrapeProduct(url: string): Promise<ProductData | null> {
  if (!isSafeUrl(url)) return null;

  const html = await fetchHtml(url);

  // Tier 1 — metadata-first.
  const product = html ? await extractGenericProduct(html, url) : emptyProduct();
  if (hasCoreData(product)) return finalizeProduct(product, url);

  // Tier 2 — known-store parser. Uses the same HTML, or the store's own API
  // (async parsers) when the initial fetch was blocked/empty.
  const storeResult = await runStoreScraper(url, html ?? "");
  if (storeResult) fillGaps(product, storeResult);
  if (hasCoreData(product)) return finalizeProduct(product, url);

  // Tier 3 — headless render, only when metadata is still absent (stub → null).
  const renderedHtml = await renderWithHeadlessBrowser(url);
  if (renderedHtml) {
    fillGaps(product, await extractGenericProduct(renderedHtml, url));
  }

  return finalizeProduct(product, url);
}
