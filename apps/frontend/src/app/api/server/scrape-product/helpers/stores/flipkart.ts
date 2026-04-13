import * as cheerio from "cheerio";
import { ScraperMethod } from "../types";

/**
 * Скрапер для Flipkart.com — індійський маркетплейс.
 *
 * Особливості:
 * - Flipkart часто блокує серверні запити reCAPTCHA (403)
 * - Коли HTML доступний, OG meta містить title і image
 * - Опис містить ціну: "Buy ... at Rs. 300 at Flipkart.com"
 * - OG image має 300x300, потрібно замінити на 1500x1500
 * - Заголовок OG містить " - Buy ... | Flipkart.com" суфікс
 */
export const scrapeFlipkart: ScraperMethod = (html, _url) => {
  const $ = cheerio.load(html);

  // --- Title ---
  let title: string | null = null;
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  if (ogTitle) {
    // Remove " - Buy ... Online at Best Price in India | Flipkart.com"
    title = ogTitle.replace(/\s*-\s*Buy\s.*$/i, "").trim();
  }
  if (!title) {
    const pageTitle = $("title").text().trim();
    if (pageTitle && !pageTitle.toLowerCase().includes("recaptcha")) {
      title = pageTitle.replace(/\s*-\s*Buy\s.*$/i, "").trim();
    }
  }

  // --- Image ---
  let image = $('meta[property="og:image"]').attr("content")?.trim() || null;
  // Upgrade from 300x300 to 1500x1500
  if (image) {
    image = image.replace(/\/image\/\d+\/\d+\//, "/image/1500/1500/");
  }

  // --- Price from meta description ---
  let price: string | null = null;
  const metaDesc =
    $('meta[name="Description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";

  // "Buy ... at Rs. 2,999 at Flipkart.com"
  const rsMatch = metaDesc.match(/Rs\.\s*([\d,]+)/);
  if (rsMatch) {
    price = rsMatch[1].replace(/,/g, "");
  }

  // --- Description ---
  // Flipkart doesn't expose meaningful descriptions in meta
  const description: string | null = null;

  return {
    title,
    description,
    image,
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: price ? "INR" : null,
  };
};
