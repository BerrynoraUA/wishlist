import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice, extractDescription, extractImage } from "../utils";

/**
 * Scraper for Horoshop-based Ukrainian stores (bujobox, hobymonster, leleka, etc.).
 * These sites use Schema.org microdata with itemprop attributes.
 * Prefers h1[itemprop="name"] over og:title to avoid site suffix.
 */
export function scrapeHoroshop(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // Title: h1 with itemprop="name" is the cleanest source
  const title =
    $('h1[itemprop="name"]').first().text().trim() ||
    $("h1.product-title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    null;

  // The visible product price is more reliable than Schema.org data on some Horoshop stores.
  const priceBlock = $(".product-info .list-unstyled .price").first();
  const currentPrice = extractNumericPrice(priceBlock.find("h2").first().text());
  const oldPrice = extractNumericPrice(priceBlock.children("span").first().text());
  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);

  let price = hasDiscount ? oldPrice : currentPrice;
  const priceMeta = $('meta[itemprop="price"]').attr("content");
  if (!price && priceMeta) {
    price = extractNumericPrice(priceMeta);
  }

  // Currency from microdata
  const currency = $('meta[itemprop="priceCurrency"]').attr("content") || "UAH";

  return {
    title,
    description: extractDescription($),
    image: extractImage($, url),
    price,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency,
  };
}

export async function scrapeLelekan(html: string, url: string): Promise<ProductData> {
  const product = scrapeHoroshop(html, url);
  if (!product.has_discount) return product;

  const promotionPath = html.match(/\.load\(\s*["']([^"']*product_promotion[^"']*)["']\s*\)/)?.[1];
  if (!promotionPath) return product;

  try {
    const promotionUrl = new URL(promotionPath.replaceAll("&amp;", "&"), new URL("/", url));
    const response = await fetch(promotionUrl, { headers: { Referer: url } });
    if (!response.ok) return product;

    const promotionHtml = await response.text();
    const discountEndDate = promotionHtml.match(
      /new\s+Date\(\s*["'](\d{4}-\d{2}-\d{2})["']\s*\)/,
    )?.[1];
    if (!discountEndDate) return product;

    if (new Date(discountEndDate).getTime() <= Date.now()) {
      return {
        ...product,
        price: product.discount_price ?? product.price,
        discount_price: null,
        has_discount: false,
      };
    }

    return { ...product, discount_end_date: discountEndDate };
  } catch {
    return product;
  }
}
