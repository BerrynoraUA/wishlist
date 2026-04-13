import * as cheerio from "cheerio";
import { ScraperMethod } from "../types";

/**
 * Скрапер для RubyLane.com — маркетплейс антикваріату.
 *
 * Особливості:
 * - Rubylane часто блокує серверні запити (400/403)
 * - Коли HTML доступний, використовує OG meta та JSON-LD Product
 * - Ціна в USD
 * - Зображення на cdn0.rubylane.com
 */
export const scrapeRubylane: ScraperMethod = (html, _url) => {
  const $ = cheerio.load(html);

  // Skip error pages
  const pageTitle = $("title").text().trim();
  if (pageTitle === "Page Load Problem" || pageTitle === "") {
    return {
      title: null,
      description: null,
      image: null,
      price: null,
      discount_price: null,
      has_discount: false,
      discount_end_date: null,
      currency: null,
    };
  }

  // --- Title ---
  let title = $('meta[property="og:title"]').attr("content")?.trim() || pageTitle || null;

  // Remove " : Ruby Lane" suffix if present
  if (title) {
    title = title.replace(/\s*:\s*Ruby\s*Lane$/i, "").trim();
  }

  // --- Image ---
  const image = $('meta[property="og:image"]').attr("content")?.trim() || null;

  // --- Description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  // --- Price from JSON-LD Product ---
  let price: string | null = null;
  let currency: string | null = null;

  const ldScripts = $('script[type="application/ld+json"]');
  ldScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data["@type"] !== "Product") return;

      const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
      if (offer) {
        if (offer.price) price = String(offer.price);
        if (offer.priceCurrency) currency = offer.priceCurrency;
      }
    } catch {
      /* ignore */
    }
  });

  // Fallback: price from meta or itemprop
  if (!price) {
    const metaPrice =
      $('meta[property="product:price:amount"]').attr("content")?.trim() ||
      $('[itemprop="price"]').attr("content")?.trim();
    if (metaPrice) price = metaPrice;
  }

  if (!currency) {
    currency =
      $('meta[property="product:price:currency"]').attr("content")?.trim() ||
      $('[itemprop="priceCurrency"]').attr("content")?.trim() ||
      "USD";
  }

  return {
    title,
    description,
    image,
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: price ? currency : null,
  };
};
