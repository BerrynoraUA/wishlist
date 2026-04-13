import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice, extractDescription } from "../utils";

/**
 * n11.com — турецький маркетплейс.
 * Проблеми: SVG placeholder зображення, невірна валюта (CAD), назва категорії замість товару.
 */
export function scrapeN11(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // --- title ---
  // og:title on n11 product pages contains the real product name
  let title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1.proName").text().trim() ||
    $("h1.product-name").text().trim() ||
    $("title").text().trim() ||
    null;
  // Clean " - n11.com" suffix
  if (title) {
    title = title.replace(/\s*[-–—]\s*n11\.com.*$/i, "").trim();
  }

  // --- image ---
  // n11 uses lazy-loading; og:image may be SVG placeholder
  let image = $('meta[property="og:image"]').attr("content")?.trim() || null;

  // Skip SVG placeholders
  if (image && (image.startsWith("data:") || image.includes("<svg"))) {
    image = null;
  }

  if (!image) {
    // Try product detail image selectors
    const imgSelectors = [
      ".imgObj img",
      ".unf-p-img img",
      "#mainItemImg",
      ".product-images img",
      ".sliderMainImg img",
    ];
    for (const sel of imgSelectors) {
      const el = $(sel).first();
      const src =
        el.attr("data-original") ||
        el.attr("data-src") ||
        el.attr("data-lazy") ||
        el.attr("src") ||
        "";
      if (src && !src.startsWith("data:") && src.includes("http")) {
        image = src;
        break;
      }
    }
  }

  // Last resort: find any real image URL in n11scdn domain
  if (!image) {
    const imgMatch = html.match(
      /https:\/\/n11scdn\.akamaized\.net\/[^\s"']+\.(?:jpg|png|webp)/i,
    );
    if (imgMatch) image = imgMatch[0];
  }

  // --- description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    extractDescription($) ||
    null;

  // --- price ---
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;

  // JSON-LD Product
  $('script[type="application/ld+json"]').each((_, el) => {
    if (currentPrice) return;
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] !== "Product") continue;
        const offers = item.offers;
        if (!offers) continue;
        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          const p = offer.price ?? offer.lowPrice ?? null;
          if (p != null) {
            currentPrice = extractNumericPrice(String(p));
            break;
          }
        }
      }
    } catch {
      /* ignore */
    }
  });

  // DOM price selectors
  if (!currentPrice) {
    const priceSelectors = [
      ".newPrice ins",
      ".newPrice",
      ".sale-price",
      ".price-on-sale",
      '[data-price="current"]',
      ".unf-p-price-s",
    ];
    for (const sel of priceSelectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        const p = extractNumericPrice(text);
        if (p) {
          currentPrice = p;
          break;
        }
      }
    }
  }

  // Old price
  if (!oldPrice) {
    const oldSelectors = [
      ".oldPrice del",
      ".oldPrice",
      ".old-price",
      ".price-old",
      '[data-price="old"]',
    ];
    for (const sel of oldSelectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        const p = extractNumericPrice(text);
        if (p) {
          oldPrice = p;
          break;
        }
      }
    }
  }

  // Regex fallback: "754,38 TL" pattern
  if (!currentPrice) {
    const priceMatch = html.match(
      /(?:SEPETTE|indirimli|fiyat)[^<]*?([\d.,\s]+)\s*TL/i,
    );
    if (priceMatch) {
      currentPrice = extractNumericPrice(priceMatch[1]);
    }
  }
  if (!currentPrice) {
    const priceMatch = html.match(/"price"\s*:\s*([\d.]+)/);
    if (priceMatch) {
      currentPrice = extractNumericPrice(priceMatch[1]);
    }
  }

  // Normalize discount
  if (oldPrice && currentPrice) {
    const oN = parseFloat(oldPrice);
    const cN = parseFloat(currentPrice);
    if (oN < cN) [oldPrice, currentPrice] = [currentPrice, oldPrice];
    if (oN === cN) oldPrice = null;
  }

  const hasDiscount = Boolean(
    oldPrice && currentPrice && oldPrice !== currentPrice,
  );

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: "TRY",
  };
}
