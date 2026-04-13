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

  // Price from Schema.org microdata
  let price: string | null = null;
  const priceMeta = $('meta[itemprop="price"]').attr("content");
  if (priceMeta) {
    price = extractNumericPrice(priceMeta);
  }

  // Currency from microdata
  const currency = $('meta[itemprop="priceCurrency"]').attr("content") || "UAH";

  return {
    title,
    description: extractDescription($),
    image: extractImage($, url),
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency,
  };
}
