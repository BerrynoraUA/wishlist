import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

export function scrapeEpicentr(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  let oldPrice: string | null = null;
  let currentPrice: string | null = null;

  // 1. Epicentr-specific selectors
  const mainPriceText = $(".product-box__main_price").text().trim();
  if (mainPriceText) {
    currentPrice = extractNumericPrice(mainPriceText);
  }

  const discountLabel = $(".product-box__main_discount label").text().trim();
  if (discountLabel) {
    oldPrice = extractNumericPrice(discountLabel);
  }

  // 2. Fallback: <del>/<s> with data[value]
  if (!oldPrice) {
    $('del, s, [style*="line-through"]').each((_, el) => {
      if (oldPrice) return;
      const dataEl = $(el).find("data[value]").first();
      if (dataEl.length) {
        const val = dataEl.attr("value");
        if (val) {
          const p = extractNumericPrice(val);
          if (p) {
            oldPrice = p;
            return;
          }
        }
      }
      const text = $(el).text().trim();
      const price = extractNumericPrice(text);
      if (price && parseFloat(price.replace(/[^\d.]/g, "")) > 0) {
        oldPrice = price;
      }
    });
  }

  // 3. Fallback: itemprop="price" not inside strikethrough
  if (!currentPrice) {
    $('[itemprop="price"]').each((_, el) => {
      if (currentPrice) return;
      if ($(el).closest('del, s, [style*="line-through"]').length > 0) return;
      const val = $(el).attr("content") || $(el).attr("value");
      if (val) {
        const p = extractNumericPrice(val);
        if (p) currentPrice = p;
      }
    });
  }

  // 4. JSON-LD fallback
  if (!currentPrice) {
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((_, el) => {
      if (currentPrice) return;
      try {
        const json = JSON.parse($(el).text());
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item["@type"] === "Product" && item.offers) {
            const offer = Array.isArray(item.offers)
              ? item.offers[0]
              : item.offers;
            if (offer.price) {
              currentPrice =
                currentPrice || extractNumericPrice(String(offer.price));
            }
          }
        }
      } catch {
        /* ignore */
      }
    });
  }

  // 5. Regex fallback for "8 580 ₴" pattern
  if (!currentPrice) {
    const priceMatch = html.match(/(\d[\d\s]*\d)\s*₴/i);
    if (priceMatch) {
      currentPrice = extractNumericPrice(priceMatch[1]);
    }
  }

  // 6. Validate: oldPrice must be > currentPrice
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

  const hasDiscount = Boolean(
    oldPrice && currentPrice && oldPrice !== currentPrice,
  );

  return {
    title: $("h1").first().text().trim() || extractTitle($),
    description: extractDescription($),
    image:
      $('meta[property="og:image"]').attr("content") || extractImage($, url),
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
  };
}
