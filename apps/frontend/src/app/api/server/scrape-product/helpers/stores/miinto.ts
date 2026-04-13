import * as cheerio from "cheerio";
import { ScraperMethod } from "../types";

/**
 * Скрапер для Miinto.com — мультибрендовий фешн-маркетплейс.
 *
 * Особливості:
 * - Inline JSON в HTML містить product data з ціною в центах
 * - og:title має формат "Name | Brand | Men's Fashion | Miinto" (Men's Fashion — breadcrumb)
 * - Acceptance criteria очікує "Name | Brand | Category | Miinto" (Category з inline JSON)
 * - Ціни в центах: price / 100, originalPrice / 100
 * - isOnSale + discountPercent для знижок
 */
export const scrapeMiinto: ScraperMethod = (html, _url) => {
  const $ = cheerio.load(html);

  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;
  let price: string | null = null;
  let discountPrice: string | null = null;
  let hasDiscount = false;
  let currency: string | null = null;

  // --- Extract inline product JSON ---
  // Pattern: "TITLE","brand":"BRAND",...,"price":{"originalPrice":CENTS,"price":CENTS},...,"category":"Cat > Sub"
  const productJsonMatch = html.match(
    /("[^"]+"),\s*"brand"\s*:\s*"([^"]+)"[^}]*"price"\s*:\s*\{\s*"originalPrice"\s*:\s*(\d+)\s*,\s*"price"\s*:\s*(\d+)\s*\}[^]*?"isOnSale"\s*:\s*(true|false)[^]*?"category"\s*:\s*"([^"]+)"/,
  );

  if (productJsonMatch) {
    const productName = productJsonMatch[1].replace(/^"|"$/g, "");
    const brand = productJsonMatch[2];
    const originalPriceCents = parseInt(productJsonMatch[3], 10);
    const salePriceCents = parseInt(productJsonMatch[4], 10);
    const isOnSale = productJsonMatch[5] === "true";
    const category =
      productJsonMatch[6]
        .replace(/\\u003e/g, ">")
        .split(">")
        .pop()
        ?.trim() || "";

    // Title: "Name | Brand | Category | Miinto"
    title = [productName, brand, category, "Miinto"]
      .filter(Boolean)
      .join(" | ");

    // Price (in cents → dollars)
    if (isOnSale && originalPriceCents !== salePriceCents) {
      hasDiscount = true;
      price = (originalPriceCents / 100).toFixed(2);
      discountPrice = (salePriceCents / 100).toFixed(2);
    } else {
      price = (salePriceCents / 100).toFixed(2);
    }
  }

  // --- Fallback title from og:title ---
  if (!title) {
    title = $('meta[property="og:title"]').attr("content")?.trim() || null;
  }

  // --- Currency ---
  currency =
    $('meta[property="product:price:currency"]').attr("content")?.trim() ||
    "USD";

  // --- Image: og:image ---
  image = $('meta[property="og:image"]').attr("content")?.trim() || null;

  // --- Description ---
  description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  return {
    title,
    description,
    image,
    price,
    discount_price: discountPrice,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency,
  };
};
