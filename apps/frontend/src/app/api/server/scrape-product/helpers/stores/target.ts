import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice, extractImage, extractDescription } from "../utils";

/**
 * Target.com — ціни зберігаються в __TGT_DATA__ JSON, не в DOM-елементах.
 */
export function scrapeTarget(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // --- title ---
  let title =
    $('h1[data-test="product-title"]').text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    null;

  // --- image ---
  const image =
    $('meta[property="og:image"]').attr("content")?.trim() || extractImage($, url) || null;

  // --- description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() || extractDescription($) || null;

  // --- price from __TGT_DATA__ JSON ---
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;

  // current_retail or current_retail_min
  const currentMatch = html.match(/"current_retail(?:_min)?"\s*:\s*([\d.]+)/);
  if (currentMatch) {
    currentPrice = extractNumericPrice(currentMatch[1]);
  }
  // formatted_current_price fallback
  if (!currentPrice) {
    const fmtMatch = html.match(/"formatted_current_price"\s*:\s*"([^"]+)"/);
    if (fmtMatch) {
      currentPrice = extractNumericPrice(fmtMatch[1]);
    }
  }

  // reg_retail or reg_retail_max (original price)
  const regMatch = html.match(/"reg_retail(?:_max)?"\s*:\s*([\d.]+)/);
  if (regMatch) {
    oldPrice = extractNumericPrice(regMatch[1]);
  }
  if (!oldPrice) {
    const fmtRegMatch = html.match(/"formatted_comparison_price"\s*:\s*"([^"]+)"/);
    if (fmtRegMatch) {
      oldPrice = extractNumericPrice(fmtRegMatch[1]);
    }
  }

  // Normalize discount
  if (oldPrice && currentPrice) {
    const oldNum = parseFloat(oldPrice);
    const curNum = parseFloat(currentPrice);
    if (oldNum < curNum) [oldPrice, currentPrice] = [currentPrice, oldPrice];
    if (oldNum === curNum) oldPrice = null;
  }

  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: "USD",
  };
}
