import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

export function scrapeFoxtrot(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  let oldPrice: string | null = null;
  let currentPrice: string | null = null;
  let discountEndDate: string | null = null;

  // 1. Current/sale price from [data-product-price-main]
  const mainPriceEl = $("[data-product-price-main]");
  if (mainPriceEl.length) {
    const dataEl = mainPriceEl.find("data[value]").first();
    if (dataEl.length) {
      const val = dataEl.attr("value") || dataEl.attr("content");
      if (val) currentPrice = extractNumericPrice(val);
    }
    if (!currentPrice) {
      currentPrice = extractNumericPrice(mainPriceEl.text().trim());
    }
  }

  // 2. Old price from [data-product-price-old]
  const oldPriceEl = $("[data-product-price-old]");
  if (oldPriceEl.length) {
    const dataEl = oldPriceEl.find("data[value]").first();
    if (dataEl.length) {
      const val = dataEl.attr("value") || dataEl.attr("content");
      if (val) oldPrice = extractNumericPrice(val);
    }
    if (!oldPrice) {
      oldPrice = extractNumericPrice(oldPriceEl.text().trim());
    }
  }

  // 3. priceValidUntil
  const validUntil = $('[itemprop="priceValidUntil"]').attr("content");
  if (validUntil) {
    discountEndDate = validUntil.split("T")[0];
  }

  // 4. Fallback: product-box__main selectors (older layout)
  if (!currentPrice) {
    const boxPrice = $(".product-box__main_price").text().trim();
    if (boxPrice) currentPrice = extractNumericPrice(boxPrice);
  }
  if (!oldPrice) {
    const boxOldLabel = $(".product-box__main_discount label").text().trim();
    if (boxOldLabel) oldPrice = extractNumericPrice(boxOldLabel);
  }

  // 5. Fallback: data-rewish-price attribute
  if (!currentPrice) {
    const rewishPrice = $("[data-rewish-price]").attr("data-rewish-price");
    if (rewishPrice) currentPrice = extractNumericPrice(rewishPrice);
  }

  // 6. Fallback: Schema.org microdata (itemprop="price" NOT inside <s>)
  if (!currentPrice) {
    $('[itemprop="price"]').each((_, el) => {
      if (currentPrice) return;
      if ($(el).closest("s, del, [data-product-price-old]").length > 0) return;
      const val = $(el).attr("content") || $(el).attr("value");
      if (val) {
        const p = extractNumericPrice(val);
        if (p) currentPrice = p;
      }
    });
  }

  // 7. Validate
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

  // Image: Foxtrot's og:image is often a generic store logo
  let image: string | null = null;

  const productImageSelectors = [
    '[data-testid="product-image"] img',
    '[data-testid="main-image"] img',
    '[class*="product-gallery"] img',
    '[class*="product-image"] img',
    '[class*="product__image"] img',
    '[class*="gallery"] img[src]',
    '[class*="slider"] img[src]',
    '[class*="carousel"] img[src]',
    'img[itemprop="image"]',
    "[data-product-image] img",
    "picture source[srcset]",
  ];

  for (const selector of productImageSelectors) {
    const el = $(selector).first();
    if (el.length) {
      const src =
        el.attr("src") ||
        el.attr("srcset")?.split(/[\s,]+/)?.[0] ||
        el.attr("data-src");
      if (src && !src.includes("placeholder") && !src.includes("no-image")) {
        image = src.startsWith("//") ? "https:" + src : src;
        break;
      }
    }
  }

  // JSON-LD image
  if (!image) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (image) return;
      try {
        const json = JSON.parse($(el).text());
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item["@type"] === "Product" && item.image) {
            const img = Array.isArray(item.image) ? item.image[0] : item.image;
            if (img && typeof img === "string") {
              image = img;
              return;
            }
            if (img?.url) {
              image = img.url;
              return;
            }
          }
        }
      } catch {
        /* ignore */
      }
    });
  }

  // og:image — only if it's NOT a generic store logo
  if (!image) {
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (
      ogImage &&
      !/foxtrot\.(png|jpg|jpeg|svg|webp)/i.test(ogImage) &&
      !/logo/i.test(ogImage)
    ) {
      image = ogImage;
    }
  }

  // Generic fallback
  if (!image) {
    image = extractImage($, url);
  }

  return {
    title: $("h1").first().text().trim() || extractTitle($),
    description: extractDescription($),
    image,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: discountEndDate,
  };
}
