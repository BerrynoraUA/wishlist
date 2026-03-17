import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractPriceFromJSON,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

export function scrapeProm(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  let currentPrice: string | null = null;
  let oldPrice: string | null = null;

  // 1. data-qaprice attributes (most reliable)
  const currentPriceAttr = $('[data-qaid="product_price"]').attr(
    "data-qaprice",
  );
  if (currentPriceAttr) {
    currentPrice = extractNumericPrice(currentPriceAttr);
  }

  const oldPriceAttr = $('[data-qaid="old_price"]').attr("data-qaprice");
  if (oldPriceAttr) {
    oldPrice = extractNumericPrice(oldPriceAttr);
  }

  // 2. Fallback: text content
  if (!currentPrice) {
    const currentPriceText =
      $('[data-qaid="product_price"]').text().trim() ||
      $(".product-price").text().trim();
    currentPrice = extractNumericPrice(currentPriceText);
  }

  if (!oldPrice) {
    const oldPriceText =
      $('[data-qaid="old_price"]').text().trim() ||
      $('[data-qaid="product_old_price"]').text().trim() ||
      $('[class*="old-price"], [class*="old_price"]').text().trim();
    oldPrice = extractNumericPrice(oldPriceText);
  }

  // 3. JSON-LD fallback
  if (!currentPrice) {
    currentPrice = extractPriceFromJSON(html);
  }

  // 4. Validate
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
    image: extractImage($, url),
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
  };
}
