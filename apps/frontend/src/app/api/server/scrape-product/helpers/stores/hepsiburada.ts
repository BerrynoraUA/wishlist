import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractImage,
  extractTitle,
  extractDescription,
} from "../utils";

/**
 * Hepsiburada.com — турецький маркетплейс.
 * Ціни в JSON-LD (Product/Offer) або в HTML-атрибутах.
 */
export function scrapeHepsiburada(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // --- title ---
  let title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    extractTitle($) ||
    null;
  // Clean brand prefix if duplicated
  if (title) {
    title = title.replace(/^\s*\w+\s+/, (m) => m); // keep brand
  }

  // --- image ---
  let image = $('meta[property="og:image"]').attr("content")?.trim() || null;

  // Hepsiburada often has no OG image; find product image from HTML
  if (!image) {
    // Look for the main product image (424-600 size is the standard display size)
    const imgMatch = html.match(
      /productimages\.hepsiburada\.net\/s\/\d+\/424-600\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i,
    );
    if (imgMatch) {
      image = "https://" + imgMatch[0];
    }
  }

  // If still no image, try any productimages URL (skip tiny thumbnails 48-64, 80)
  if (!image) {
    const anyImg = html.match(
      /productimages\.hepsiburada\.net\/s\/\d+\/(?!48-64|80\/)\d[\d-]*\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i,
    );
    if (anyImg) {
      image = "https://" + anyImg[0];
    }
  }

  if (!image) {
    image = extractImage($, url) || null;
  }

  // Upgrade image size if needed (48-64 → 424-600)
  if (image && image.includes("productimages.hepsiburada.net")) {
    image = image.replace(/\/\d+-\d+\//, "/424-600/");
    // Remove /format:webp suffix for broader compatibility
    image = image.replace(/\/format:webp$/, "");
  }

  // --- description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    extractDescription($) ||
    null;

  // --- price from JSON-LD ---
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;

  // Try JSON-LD Product → offers → price
  $('script[type="application/ld+json"]').each((_, el) => {
    if (currentPrice) return;
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (
          item["@type"] !== "Product" &&
          item["@type"] !== "http://schema.org/Product"
        )
          continue;
        const offers = item.offers;
        if (!offers) continue;
        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          const p = offer.price ?? offer.lowPrice ?? offer.highPrice ?? null;
          if (p != null) {
            currentPrice = extractNumericPrice(String(p));
            break;
          }
        }
      }
    } catch {
      /* ignore malformed JSON */
    }
  });

  // Fallback: regex for price patterns in raw HTML
  if (!currentPrice) {
    // "product_price":4429 or "price":4429
    const priceMatch = html.match(/"(?:product_)?price"\s*:\s*([\d.]+)/);
    if (priceMatch) {
      currentPrice = extractNumericPrice(priceMatch[1]);
    }
  }

  // Original/list price
  const listPriceMatch = html.match(
    /"(?:originalPrice|listPrice|oldPrice)"\s*:\s*([\d.]+)/i,
  );
  if (listPriceMatch) {
    oldPrice = extractNumericPrice(listPriceMatch[1]);
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
