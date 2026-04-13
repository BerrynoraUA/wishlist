import * as cheerio from "cheerio";
import { ScraperMethod } from "../types";

/**
 * Скрапер для DBA.dk — данський класифайд-сайт.
 *
 * Особливості:
 * - OG title містить " | DBA" суфікс та подвійні пробіли
 * - Ціна є в HTML елементі `<p class="m-0 h2">850 kr.</p>`
 *   та в JSON `"price":850` в інлайн-скриптах
 * - Валюта завжди DKK
 * - Зображення з OG meta (dbastatic.dk)
 */
export const scrapeDBA: ScraperMethod = (html, _url) => {
  const $ = cheerio.load(html);

  // --- Title ---
  let title =
    $('meta[property="og:title"]').attr("content")?.trim() || $("title").text().trim() || null;

  if (title) {
    // Remove " | DBA" suffix
    title = title.replace(/\s*\|\s*DBA$/i, "").trim();
    // Collapse multiple spaces
    title = title.replace(/\s{2,}/g, " ");
  }

  // --- Image ---
  const image = $('meta[property="og:image"]').attr("content")?.trim() || null;

  // --- Description ---
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  // --- Price ---
  let price: string | null = null;

  // 1. Try HTML element: <p class="m-0 h2">850 kr.</p>
  const priceParagraph = $("p.h2, p.m-0.h2").first().text().trim();
  const krMatch = priceParagraph.match(/([\d.,]+)\s*kr\./);
  if (krMatch) {
    price = krMatch[1].replace(/\./g, "").replace(",", ".");
  }

  // 2. Fallback: JSON "price":NNN in inline scripts
  if (!price) {
    const jsonPriceMatch = html.match(/"price\\?":\s*(\d+)/);
    if (jsonPriceMatch) {
      price = jsonPriceMatch[1];
    }
  }

  return {
    title,
    description,
    image,
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: price ? "DKK" : null,
  };
};
