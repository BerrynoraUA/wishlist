import * as cheerio from "cheerio";
import { ScraperMethod } from "../types";

/**
 * Скрапер для Grailed.com — маркетплейс люксового одягу.
 *
 * Особливості:
 * - JSON-LD Product містить brand, price, currency, image
 * - JSON-LD name НЕ включає бренд, але og:title включає ("Versace Title | Grailed")
 * - og:description краще за JSON-LD description (яке є generic)
 */
export const scrapeGrailed: ScraperMethod = (html, _url) => {
  const $ = cheerio.load(html);

  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;
  let price: string | null = null;
  let currency: string | null = null;

  // --- Parse JSON-LD Product ---
  const ldScripts = $('script[type="application/ld+json"]');
  ldScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data["@type"] !== "Product") return;

      // Title: prepend brand name if available
      const name = data.name?.trim() || null;
      const brand =
        typeof data.brand === "string" ? data.brand.trim() : data.brand?.name?.trim() || null;

      if (name && brand) {
        title = `${brand} ${name}`;
      } else {
        title = name;
      }

      // Image
      if (typeof data.image === "string") {
        image = data.image;
      } else if (Array.isArray(data.image) && data.image.length) {
        image = data.image[0];
      }

      // Price from offers
      const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
      if (offer) {
        if (offer.price) price = String(offer.price);
        if (offer.priceCurrency) currency = offer.priceCurrency;
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  });

  // --- Fallback title from og:title ---
  if (!title) {
    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    if (ogTitle) {
      title = ogTitle.replace(/\s*\|\s*Grailed$/i, "").trim();
    }
  }

  // --- Description: prefer og:description (more descriptive than JSON-LD) ---
  description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  // --- Fallback image from og:image ---
  if (!image) {
    image = $('meta[property="og:image"]').attr("content")?.trim() || null;
  }

  return {
    title,
    description,
    image,
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency,
  };
};
