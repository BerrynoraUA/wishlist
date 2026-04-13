import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractCurrency, extractNumericPrice, extractDescription, extractImage } from "../utils";

export function scrapeAvrora(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // --- Title ---
  // Clean product name from <title>: strip " - купити... | Мультимаркет Аврора" suffix
  // Also strip article number like "(105524)"
  let title: string | null = null;
  const pageTitle = $("title").text().trim();
  if (pageTitle) {
    title = pageTitle
      .replace(/\s*\(\d+\)\s*/g, "") // strip (105524)
      .replace(/\s*[-–|].*$/i, "") // strip site suffix
      .trim();
  }

  // Prefer h1 if available and clean
  const h1 = $("h1").first().text().trim();
  if (h1 && h1.length > 5 && h1.length < 200) {
    title = h1.replace(/\s*\(\d+\)\s*/g, "").trim();
  }

  // --- Prices ---
  // Avrora shows: discount_price original_price (e.g., "158 грн 229 грн")
  let oldPrice: string | null = null;
  let currentPrice: string | null = null;

  // Look for price elements: del/s for old price, common price selectors
  const oldPriceEl = $(
    ".ty-price-old .ty-price-num, .ty-list-price .ty-price-num, del .ty-price-num, s .ty-price-num, .ty-strike .ty-price-num",
  );
  if (oldPriceEl.length) {
    oldPrice = extractNumericPrice(oldPriceEl.first().text());
  }

  const currentPriceEl = $(".ty-price-update .ty-price-num, .ty-price-num").not(oldPriceEl);
  if (currentPriceEl.length) {
    currentPrice = extractNumericPrice(currentPriceEl.first().text());
  }

  // Fallback: Schema.org microdata
  if (!currentPrice) {
    const priceEl = $('[itemprop="price"]');
    if (priceEl.length) {
      const val = priceEl.attr("content") || priceEl.text();
      currentPrice = extractNumericPrice(val);
    }
  }

  // Fallback: meta product:price
  if (!currentPrice) {
    const metaPrice = $('meta[property="product:price:amount"]').attr("content");
    if (metaPrice) {
      currentPrice = extractNumericPrice(metaPrice);
    }
  }

  // Validate price order
  if (oldPrice && currentPrice) {
    const oldNum = parseFloat(oldPrice.replace(/[^\d.]/g, ""));
    const curNum = parseFloat(currentPrice.replace(/[^\d.]/g, ""));
    if (oldNum < curNum) {
      [oldPrice, currentPrice] = [currentPrice, oldPrice];
    }
    if (oldNum === curNum) {
      oldPrice = null;
    }
  }

  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);

  return {
    title: title || null,
    description: extractDescription($),
    image: extractImage($, url),
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: extractCurrency($, html, url),
  };
}
