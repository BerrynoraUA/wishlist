import type { ScraperStatus, ProductData } from "@/app/admin/scraper-test/constants";
import type { DetailedScrapeProduct } from "./scraper";

export interface ClassifiedScrape {
  status: ScraperStatus;
  data: ProductData | null;
  error?: string;
  missingFields?: string[];
}

/**
 * Turn the rich scrape result into the status the admin/unresolved tooling uses.
 * Kept in one place so the admin scraper-test route and the production
 * scrape-product route classify results identically.
 *
 * success = title + image + price all present. Anything missing one of those
 * main fields is `partial`; blocked/failed/unavailable are self-explanatory.
 */
export function classifyScrape(scraped: DetailedScrapeProduct): ClassifiedScrape {
  const product = scraped.product;

  if (scraped.unavailable) {
    return { status: "unavailable", data: product, error: scraped.error ?? "API is unavailable" };
  }

  const isApiResult =
    scraped.diagnostics?.engine === "official_api" ||
    scraped.diagnostics?.engine === "internal_api";

  if (!product && isApiResult) {
    return {
      status: scraped.blocked ? "blocked" : "failed",
      data: null,
      error: scraped.error ?? "API response could not be parsed",
    };
  }

  if (!isApiResult && isAccessFailure(scraped)) {
    return {
      status: "blocked",
      data: product,
      error:
        scraped.error ??
        (product ? "Product page could not be accessed" : "No product data could be accessed"),
    };
  }

  if (!product) {
    // isAccessFailure guarantees a product above; guard for the type checker.
    return { status: "failed", data: null, error: scraped.error ?? "No product data" };
  }

  const missingFields: string[] = [];
  if (!product.title) missingFields.push("title");
  if (!product.image) missingFields.push("image");
  if (!product.price) missingFields.push("price");

  return {
    status: missingFields.length === 0 ? "success" : "partial",
    data: product,
    missingFields,
  };
}

/**
 * Whether a classified scrape should be recorded as an unresolved site.
 * Only fully blocked or failed scrapes count; a `partial` (page opened but some
 * main fields missing), a healthy `success`, or a transient `unavailable` API
 * outage do not.
 */
export function shouldRecordUnresolved(status: ScraperStatus): boolean {
  return status === "blocked" || status === "failed";
}

export function isAccessFailure(scraped: DetailedScrapeProduct): boolean {
  if (scraped.blocked || !scraped.product) return true;

  const warnings = scraped.diagnostics?.warnings ?? [];
  if (warnings.some((warning) => /blocked|placeholder|captcha|challenge/i.test(warning))) {
    return true;
  }

  const product = scraped.product;
  return !product.image && !product.price && !product.discount_price;
}

/** Prepend https:// when a URL comes in without a scheme (e.g. "etsy.com/..."). */
export function ensureUrlScheme(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

export function getComparableDomain(url: string): string | null {
  try {
    return new URL(ensureUrlScheme(url)).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
