import { genericScrapers } from "./helpers/generic";
import { getStoreScraper } from "./helpers/stores";
import { emptyProduct, type ProductData } from "./helpers/types";
import { isSafeUrl } from "./helpers/validate-url";

export type { ProductData };

export async function scrapeProduct(url: string): Promise<ProductData | null> {
  if (!isSafeUrl(url)) return null;

  const fetchHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  let response = await fetch(url, { headers: fetchHeaders });

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

  const challengeMatch = html.match(/const\s+defaultHash\s*=\s*"([a-f0-9]{64})"/);
  if (challengeMatch && html.length < 1000 && html.includes("challenge_passed")) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    const cookiePairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
    cookiePairs.push(`challenge_passed=${challengeMatch[1]}`);

    response = await fetch(url, {
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
