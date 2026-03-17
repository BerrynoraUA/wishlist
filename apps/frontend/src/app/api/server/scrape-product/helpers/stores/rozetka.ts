import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractPriceFromJSON,
  extractTitle,
  extractDescription,
  extractImage,
  extractDateFromText,
} from "../utils";

export function scrapeRozetka(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  const oldPriceText =
    $("p.product-price__small").text().trim() ||
    $(".product-price__small").text().trim() ||
    $('[class*="old-price"]').text().trim() ||
    $('[class*="price--old"]').text().trim();
  const currentPriceText =
    $("p.product-price__big").text().trim() ||
    $(".product-price__big").text().trim() ||
    $('[data-testid="price"]').text().trim() ||
    $('[class*="price"]').first().text().trim();

  const currentPrice =
    extractNumericPrice(currentPriceText) || extractPriceFromJSON(html);
  const oldPrice = extractNumericPrice(oldPriceText);

  const hasDiscount = Boolean(
    oldPrice && currentPrice && oldPrice !== currentPrice,
  );

  const promoEndText = $(
    '[class*="promo-end"], [class*="timer"], [data-testid="promotion-end"]',
  )
    .text()
    .trim();
  const discountEndDate = extractDateFromText(promoEndText);

  return {
    title: $("h1.product__title").text().trim() || extractTitle($),
    description: extractDescription($),
    image:
      $('meta[property="og:image"]').attr("content") || extractImage($, url),
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: discountEndDate,
  };
}
