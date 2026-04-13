import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

/**
 * AbeBooks.com — книжковий маркетплейс.
 * Без og:image. Є itemprop="price" / itemprop="priceCurrency" мета-теги.
 * Зображення через img[data-test-id="feature-image"] або link[rel="preload"][as="image"].
 */
export function scrapeAbebooks(html: string, url: string): ProductData {
  const $ = cheerio.load(html);
  const baseUrl = new URL(url).origin;

  // --- title ---
  const title =
    $('h1[data-test-id="main-heading"]').text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    extractTitle($) ||
    null;

  // --- image ---
  let image: string | null = null;
  // 1) img with data-test-id="feature-image"
  const featureImg = $('img[data-test-id="feature-image"]').attr("src");
  if (featureImg) {
    image = featureImg.trim();
  }
  // 2) preload link
  if (!image) {
    const preloadHref = $('link[rel="preload"][as="image"]').attr("href");
    if (preloadHref) {
      image = preloadHref.trim();
    }
  }
  // 3) fallback generic
  if (!image) {
    image = extractImage($, baseUrl);
  }
  // Ensure absolute URL
  if (image && !image.startsWith("http")) {
    try {
      image = new URL(image, baseUrl).href;
    } catch {
      // malformed, keep as-is
    }
  }

  // --- price ---
  let price: string | null = null;
  let discountPrice: string | null = null;

  // itemprop="price" meta tag
  const priceContent = $('meta[itemprop="price"]').attr("content");
  if (priceContent) {
    price = extractNumericPrice(priceContent);
  }
  // Fallback: try #book-price or .item-price selectors
  if (!price) {
    const priceEl = $("#book-price").text() || $(".item-price").first().text();
    if (priceEl) {
      price = extractNumericPrice(priceEl);
    }
  }

  // --- currency ---
  let currency: string | null = null;
  const currencyMeta = $('meta[itemprop="priceCurrency"]').attr("content");
  if (currencyMeta) {
    currency = currencyMeta.trim().toUpperCase();
  }

  // --- description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    extractDescription($) ||
    null;

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: price,
    discount_price: discountPrice,
    has_discount: false,
    discount_end_date: null,
    currency: currency || "USD",
  };
}
