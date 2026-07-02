import { genericScrapers } from "./helpers/generic";
import { getStoreScraper } from "./helpers/stores";
import { emptyProduct, type ProductData } from "./helpers/types";
import { isSafeUrl } from "./helpers/validate-url";
import {
  getScraplingMode,
  isAcceptableProduct,
  logShadowComparison,
  scoreProduct,
  scrapeWithScrapling,
  shouldSampleScraplingShadow,
} from "./scrapling-client";

export type { ProductData };

export async function scrapeProduct(url: string): Promise<ProductData | null> {
  url = canonicalizeProductUrl(url);
  const mode = getScraplingMode();
  let legacyProduct: ProductData | null = null;
  let legacyError: unknown = null;

  try {
    legacyProduct = await scrapeProductLegacy(url);
  } catch (error) {
    legacyError = error;
    if (mode === "disabled") throw error;
  }

  if (mode === "disabled") return legacyProduct;

  if (mode === "shadow") {
    if (shouldSampleScraplingShadow(url)) {
      const scrapling = await scrapeWithScrapling(url);
      if (scrapling) logShadowComparison(legacyProduct, scrapling);
    }
    if (legacyError) throw legacyError;
    return legacyProduct;
  }

  if (isAcceptableProduct(legacyProduct)) return legacyProduct;

  const scrapling = await scrapeWithScrapling(url);
  if (!scrapling) {
    if (legacyError) throw legacyError;
    return legacyProduct;
  }
  if (scrapling.quality.accepted || scoreProduct(scrapling.product) > scoreProduct(legacyProduct)) {
    return scrapling.product;
  }
  return legacyProduct ?? scrapling.product;
}

function canonicalizeProductUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("aliexpress.") && parsed.pathname.startsWith("/item/")) {
      let skuId = parsed.searchParams.get("sku_id");
      if (!skuId) {
        const productContext = parsed.searchParams.get("pdp_ext_f");
        if (productContext) {
          try {
            const payload: unknown = JSON.parse(productContext);
            if (
              payload !== null &&
              typeof payload === "object" &&
              "sku_id" in payload &&
              (typeof payload.sku_id === "string" || typeof payload.sku_id === "number")
            ) {
              skuId = String(payload.sku_id);
            }
          } catch {
            // Ignore malformed advertising context.
          }
        }
      }
      parsed.search = skuId ? new URLSearchParams({ sku_id: skuId }).toString() : "";
      parsed.hash = "";
      return parsed.href;
    }
  } catch {
    return value;
  }
  return value;
}

async function scrapeProductLegacy(url: string): Promise<ProductData | null> {
  if (!isSafeUrl(url)) return null;

  const configuredTimeout = Number(process.env.LEGACY_SCRAPER_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000
      ? Math.min(configuredTimeout, 30_000)
      : 8_000;
  const signal = AbortSignal.timeout(timeoutMs);
  const fetchHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  let response = await fetch(url, { headers: fetchHeaders, signal });

  if (!response.ok) {
    const storeEntry = getStoreScraper(url);
    if (storeEntry?.async) {
      const result = await (
        storeEntry.scraper as (html: string, url: string) => Promise<ProductData>
      )("", url);
      if (result && (result.title || result.image || result.price)) {
        return result;
      }
    }
    return null;
  }

  let html = await response.text();
  if (isNonProductResponse(html, url)) {
    // A number of stores return HTTP 200 for a challenge, homepage or login
    // shell. Treat it as a failed legacy fetch so fallback mode can invoke the
    // full Scrapling browser/proxy cascade.
    return null;
  }

  const challengeMatch = html.match(/const\s+defaultHash\s*=\s*"([a-f0-9]{64})"/);
  if (challengeMatch && html.length < 1000 && html.includes("challenge_passed")) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    const cookiePairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
    cookiePairs.push(`challenge_passed=${challengeMatch[1]}`);

    response = await fetch(url, {
      signal,
      headers: {
        ...fetchHeaders,
        Cookie: cookiePairs.join("; "),
      },
    });
    if (!response.ok) return null;
    html = await response.text();
  }

  const storeEntry = getStoreScraper(url);
  let storeResult: ProductData | null = null;
  if (storeEntry) {
    storeResult = storeEntry.async
      ? await (storeEntry.scraper as (html: string, url: string) => Promise<ProductData>)(html, url)
      : (storeEntry.scraper as (html: string, url: string) => ProductData)(html, url);
    if (storeResult.price) {
      return storeResult;
    }
    const strictStoreDomains = [
      "target.com",
      "flipkart.com",
      "trendyol.com",
      "zalando.",
      "wildberries.ru",
    ];
    if (
      strictStoreDomains.some((domain) => new URL(url).hostname.includes(domain)) &&
      (storeResult.title || storeResult.image)
    ) {
      return storeResult;
    }
  }

  const product: ProductData =
    storeResult && (storeResult.title || storeResult.image) ? { ...storeResult } : emptyProduct();

  for (const scraper of genericScrapers) {
    const result = scraper(html, url);

    if (!product.title && result.title) product.title = result.title;
    if (!product.description && result.description) product.description = result.description;
    if (!product.image && result.image) product.image = result.image;
    if (!product.price && result.price) product.price = result.price;
    if (!product.discount_price && result.discount_price)
      product.discount_price = result.discount_price;
    if (!product.has_discount && result.has_discount) product.has_discount = result.has_discount;
    if (!product.discount_end_date && result.discount_end_date)
      product.discount_end_date = result.discount_end_date;
    if (!product.currency && result.currency) product.currency = result.currency;

    if (product.title && product.description && product.image && product.price) {
      break;
    }
  }

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

  if (!product.title && !product.description && !product.image && !product.price) {
    return null;
  }

  return product;
}

function isNonProductResponse(html: string, url: string): boolean {
  const sample = html.slice(0, 500_000).toLowerCase();
  const markers = [
    "<title>error page | ebay",
    "<title>javascript is disabled",
    "<title>register &amp; sign in - farfetch",
    "<title>register & sign in - farfetch",
    "please enable javascript to continue",
    "enable javascript and cookies to continue",
  ];
  if (markers.some((marker) => sample.includes(marker))) return true;

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return true;
  }
  const title = sample.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  if (hostname.includes("cdiscount.com") && title === "cdiscount.com") return true;
  if (
    hostname.includes("takealot.com") &&
    title.includes("online shopping") &&
    !sample.includes("plid96707778")
  ) {
    return true;
  }
  return false;
}
