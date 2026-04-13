import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractImage,
  extractDescription,
} from "../utils";

/**
 * Trendyol — ціни в __PRODUCT_DETAIL__DATALAYER (JSON), валюта в конфігу сторінки.
 */
export function scrapeTrendyol(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // --- title ---
  let title = $('meta[property="og:title"]').attr("content")?.trim() || null;
  // Clean trendyol suffix: " – Купуй на Trendyol", " - Trendyol", etc.
  if (title) {
    title = title.replace(/\s*[–—-]\s*(?:Купуй на\s+)?Trendyol.*$/i, "").trim();
  }

  // --- image ---
  const image =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    extractImage($, url) ||
    null;

  // --- description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    extractDescription($) ||
    null;

  // --- price from __PRODUCT_DETAIL__DATALAYER ---
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;

  // product_discounted_price / product_price / product_original_price
  const discountedMatch = html.match(
    /"product_discounted_price"\s*:\s*([\d.]+)/,
  );
  const priceMatch = html.match(/"product_price"\s*:\s*([\d.]+)/);
  const originalMatch = html.match(/"product_original_price"\s*:\s*([\d.]+)/);

  const discounted = discountedMatch ? parseFloat(discountedMatch[1]) : null;
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;
  const original = originalMatch ? parseFloat(originalMatch[1]) : null;

  // Pick the best current price (discounted > price)
  const curNum =
    discounted && discounted > 0
      ? discounted
      : price && price > 0
        ? price
        : null;
  // Pick original if it differs
  const origNum = original && original > 0 ? original : null;

  if (curNum) currentPrice = extractNumericPrice(String(curNum));
  if (origNum) oldPrice = extractNumericPrice(String(origNum));

  // Normalize
  if (oldPrice && currentPrice) {
    const oN = parseFloat(oldPrice);
    const cN = parseFloat(currentPrice);
    if (oN < cN) [oldPrice, currentPrice] = [currentPrice, oldPrice];
    if (oN === cN) oldPrice = null;
  }

  const hasDiscount = Boolean(
    oldPrice && currentPrice && oldPrice !== currentPrice,
  );

  // --- currency from page config: "currency":"UAH" or "currency":"TRY" ---
  let currency: string | null = null;
  const currencyMatch = html.match(
    /"currency"\s*:\s*"([A-Z]{3})"\s*,\s*"currencySymbol"/,
  );
  if (currencyMatch) {
    currency = currencyMatch[1];
  }
  // Fallback: TRY for main domain
  if (!currency) {
    try {
      const host = new URL(url).hostname;
      currency = host.includes("trendyol.com") ? "TRY" : null;
    } catch {
      /* ignore */
    }
  }

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency,
  };
}
