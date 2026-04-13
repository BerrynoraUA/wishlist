import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractTitle,
  extractDescription,
} from "../utils";

/**
 * ShopGoodwill.com — аукціонний сайт (Goodwill).
 * Angular SPA: ціна рендериться client-side, в HTML є тільки og:title та og:image.
 * Ціну шукаємо через transferState JSON або regex у raw HTML.
 */
export function scrapeShopGoodwill(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // --- title ---
  let title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    extractTitle($) ||
    null;
  // Remove "Used " prefix if present (ShopGoodwill prepends condition)
  if (title) {
    title = title.replace(/^(?:Used|New|Like New|Pre-Owned)\s+/i, "").trim();
  }

  // --- image ---
  let image = $('meta[property="og:image"]').attr("content")?.trim() || null;
  // Fix backslash in Azure CDN URLs
  if (image) {
    image = image.replace(/\\/g, "/");
  }

  // --- description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    extractDescription($) ||
    null;

  // --- price ---
  // ShopGoodwill is an auction site; prices are loaded via Angular API.
  // Try to find any server-rendered price data
  let currentPrice: string | null = null;

  // Try Angular transfer state
  const transferMatch = html.match(/"currentPrice"\s*:\s*([\d.]+)/i);
  if (transferMatch) {
    currentPrice = extractNumericPrice(transferMatch[1]);
  }

  // Try different price field names
  if (!currentPrice) {
    const pricePatterns = [
      /"minimumBid"\s*:\s*([\d.]+)/i,
      /"startingBid"\s*:\s*([\d.]+)/i,
      /"buyNowPrice"\s*:\s*([\d.]+)/i,
      /"bidAmount"\s*:\s*([\d.]+)/i,
    ];
    for (const pat of pricePatterns) {
      const m = html.match(pat);
      if (m) {
        currentPrice = extractNumericPrice(m[1]);
        if (currentPrice) break;
      }
    }
  }

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: currentPrice,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: "USD",
  };
}
