import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice, extractCurrency, extractDescription } from "../utils";

/**
 * Moda Operandi — luxury fashion marketplace.
 * Rich JSON-LD Product data available; we parse it for accurate brand + title.
 */
export function scrapeModaOperandi(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;
  let currency: string | null = null;
  let brandName: string | null = null;

  // --- Parse JSON-LD Product ---
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data["@type"] !== "Product") return;

      // Title
      if (data.name) title = data.name.trim();

      // Brand
      if (data.brand?.name) brandName = data.brand.name.trim();

      // Description
      if (data.description) description = data.description.trim();

      // Image — prefer large, fallback to first contentUrl
      if (data.image) {
        const images = Array.isArray(data.image) ? data.image : [data.image];
        for (const img of images) {
          const imgUrl = typeof img === "string" ? img : img?.contentUrl;
          if (imgUrl) {
            // Prefer "large" over "medium" or "small"
            image = imgUrl.replace(/\/medium_/, "/large_").replace(/\/small_/, "/large_");
            break;
          }
        }
      }

      // Offers
      const offers = data.offers;
      if (offers) {
        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          if (offer.price != null) {
            currentPrice = extractNumericPrice(String(offer.price));
          }
          if (offer.priceCurrency) {
            currency = offer.priceCurrency;
          }
          break;
        }
      }
    } catch {
      /* ignore malformed JSON */
    }
  });

  // Append brand to title if available and not already included
  if (title != null && brandName != null) {
    const titleValue = String(title);
    const brandValue = String(brandName);
    if (!titleValue.toLowerCase().includes(brandValue.toLowerCase())) {
      title = `${titleValue} by ${brandValue}`;
    }
  }

  // Fallbacks from meta/DOM
  if (!title) {
    title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      null;
  }
  if (!description) {
    description =
      $('meta[property="og:description"]').attr("content")?.trim() || extractDescription($) || null;
  }
  if (!image) {
    image = $('meta[property="og:image"]').attr("content")?.trim() || null;
  }
  if (!currency) {
    currency = extractCurrency($, html, url);
  }

  // Discount detection: look for original price in HTML
  const origPriceMatch = html.match(/"compareAtPrice"\s*:\s*"?([\d.]+)"?/);
  if (origPriceMatch) {
    oldPrice = extractNumericPrice(origPriceMatch[1]);
  }

  if (oldPrice && currentPrice) {
    const oN = parseFloat(oldPrice);
    const cN = parseFloat(currentPrice);
    if (oN < cN) [oldPrice, currentPrice] = [currentPrice, oldPrice];
    if (oN === cN) oldPrice = null;
  }

  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency,
  };
}
