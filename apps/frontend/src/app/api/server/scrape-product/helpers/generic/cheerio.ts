import * as cheerio from "cheerio";
import { ProductData, emptyProduct } from "../types";
import {
  extractTitle,
  extractDescription,
  extractImage,
  extractPricesAdvanced,
} from "../utils";

/**
 * Cheerio скрапер — аналіз DOM-структури сторінки з покращеним парсингом ціни.
 */
export function scrapeWithCheerio(html: string, url: string): ProductData {
  try {
    const $ = cheerio.load(html);

    const { currentPrice, oldPrice, discountEndDate } = extractPricesAdvanced(
      $,
      html,
    );
    const hasDiscount = Boolean(
      oldPrice && currentPrice && oldPrice !== currentPrice,
    );

    return {
      title: extractTitle($),
      description: extractDescription($),
      image: extractImage($, url),
      price: hasDiscount ? oldPrice : currentPrice,
      discount_price: hasDiscount ? currentPrice : null,
      has_discount: hasDiscount,
      discount_end_date: discountEndDate,
    };
  } catch (error) {
    console.error("Cheerio scraping failed:", error);
    return emptyProduct();
  }
}
