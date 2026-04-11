import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractCurrency,
  extractNumericPrice,
  extractPriceFromJSON,
  extractDescription,
} from "../utils";

export function scrapeOLX(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // OLX obfuscates prices in DOM with CSS tricks (hidden spans with all digits).
  // Reliable sources: <title> tag, og:title, JSON-LD, meta tags.

  // --- Title ---
  // <title> format: "Радиомикрофоны комплект 2шт: 1 055 грн. - Студійне обладнання Павлоград на Olx"
  let title: string | null = $('[data-cy="ad_title"]').text().trim() || null;

  const pageTitle = $("title").text().trim();
  if (!title && pageTitle) {
    // Strip ": {price} грн. - {category} {city} на Olx" suffix
    const titleMatch = pageTitle.match(/^(.+?):\s*[\d\s.,]+\s*грн/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      title = pageTitle
        .replace(/\s*[-–|:]\s*(.*\bon\s*OLX|.*на\s*Olx).*$/i, "")
        .trim();
    }
  }

  // --- Price ---
  let price: string | null = null;

  // Try data-testid first (may work if JS rendered)
  const priceText = $('[data-testid="ad-price-container"]').text().trim();
  if (priceText) {
    price = extractNumericPrice(priceText);
  }

  // Fallback: extract price from <title> tag — "...: 1 055 грн. - ..."
  if (!price && pageTitle) {
    const priceMatch = pageTitle.match(/:\s*([\d\s.,]+)\s*грн/);
    if (priceMatch) {
      price = extractNumericPrice(priceMatch[1]);
    }
  }

  // Fallback: JSON embedded data
  if (!price) {
    price = extractPriceFromJSON(html);
  }

  // --- Image ---
  // og:image is the most reliable source for OLX
  let image = $('meta[property="og:image"]').attr("content") || null;

  // Normalize: remove default HTTPS port :443
  if (image) {
    image = image.replace(/:443\//, "/");
  }

  // --- Description ---
  const ogDescription =
    $('meta[property="og:description"]').attr("content") || null;
  const description = extractDescription($) || ogDescription;

  return {
    title: title || null,
    description,
    image,
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: extractCurrency($, html, url),
  };
}
