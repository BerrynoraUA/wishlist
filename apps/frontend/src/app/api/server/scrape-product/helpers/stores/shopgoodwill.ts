import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractTitle,
  extractDescription,
} from "../utils";

const SGW_API_BASE =
  "https://buyerapi.shopgoodwill.com/api/ItemDetail/GetItemDetailModelByItemId";

/**
 * ShopGoodwill.com — аукціонний сайт (Goodwill).
 * Angular SPA: дані рендеряться client-side через API.
 * Спочатку пробуємо API для повних даних, потім HTML fallback.
 */
export async function scrapeShopGoodwill(
  html: string,
  url: string,
): Promise<ProductData> {
  // Extract item ID from URL: /item/260186871
  const itemIdMatch = url.match(/\/item\/(\d+)/i);
  const itemId = itemIdMatch?.[1];

  // Try API first for complete data
  if (itemId) {
    try {
      const apiResult = await fetchShopGoodwillApi(itemId);
      if (apiResult) return apiResult;
    } catch {
      /* fall through to HTML parsing */
    }
  }

  // Fallback: parse HTML (OG meta tags)
  return scrapeShopGoodwillHtml(html);
}

async function fetchShopGoodwillApi(
  itemId: string,
): Promise<ProductData | null> {
  const res = await fetch(`${SGW_API_BASE}/${itemId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data || !data.title) return null;

  // Build full image URL from imageServer + first image path
  let image: string | null = null;
  if (data.imageUrlString && data.imageServer) {
    const firstImage = data.imageUrlString.split(";")[0];
    image = (data.imageServer + firstImage).replace(/\\/g, "/");
  }

  // Clean description: strip HTML tags
  let description: string | null = null;
  if (data.description) {
    description = cheerio.load(data.description).text().trim() || null;
  }

  // Clean title: remove condition prefix
  let title = (data.title || "").trim();
  title = title.replace(/^(?:Used|New|Like New|Pre-Owned)\s+/i, "").trim();

  // Price: currentPrice or startingPrice
  const priceValue = data.currentPrice ?? data.startingPrice ?? null;
  const price =
    priceValue != null ? extractNumericPrice(String(priceValue)) : null;

  return {
    title: title || null,
    description,
    image,
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: "USD",
  };
}

function scrapeShopGoodwillHtml(html: string): ProductData {
  const $ = cheerio.load(html);

  let title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    extractTitle($) ||
    null;
  if (title) {
    title = title.replace(/^(?:Used|New|Like New|Pre-Owned)\s+/i, "").trim();
  }

  let image = $('meta[property="og:image"]').attr("content")?.trim() || null;
  if (image) {
    image = image.replace(/\\/g, "/");
  }

  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    extractDescription($) ||
    null;

  let currentPrice: string | null = null;
  const transferMatch = html.match(/"currentPrice"\s*:\s*([\d.]+)/i);
  if (transferMatch) {
    currentPrice = extractNumericPrice(transferMatch[1]);
  }

  if (!currentPrice) {
    const pricePatterns = [
      /"minimumBid"\s*:\s*([\d.]+)/i,
      /"startingBid"\s*:\s*([\d.]+)/i,
      /"buyNowPrice"\s*:\s*([\d.]+)/i,
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
