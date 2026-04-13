import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractCurrency,
  extractNumericPrice,
  extractPriceFromJSON,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

export function scrapeEbay(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // Use first span to avoid text duplication from nested/hidden sibling spans
  const currentPriceText =
    $(".x-price-primary span.ux-textspans").first().text().trim() ||
    $(".x-price-primary").first().children().first().text().trim() ||
    $('[itemprop="price"]').attr("content") ||
    $('[itemprop="price"]').first().text().trim();

  const oldPriceText =
    $(".x-price-primary")
      .parent()
      .find(".ux-textspans--STRIKETHROUGH")
      .first()
      .text()
      .trim() ||
    $(".x-additional-info .ux-textspans--STRIKETHROUGH")
      .first()
      .text()
      .trim() ||
    $('[class*="STRIKETHROUGH"]').first().text().trim() ||
    $(".x-price-was span.ux-textspans").first().text().trim();

  const currentPrice =
    extractNumericPrice(currentPriceText) || extractPriceFromJSON(html);
  const oldPrice = extractNumericPrice(oldPriceText);

  // Validate: old must be > current
  let finalOld = oldPrice;
  let finalCurrent = currentPrice;
  if (finalOld && finalCurrent) {
    const oldNum = parseFloat(finalOld.replace(/[^\d.]/g, ""));
    const curNum = parseFloat(finalCurrent.replace(/[^\d.]/g, ""));
    if (oldNum < curNum) {
      [finalOld, finalCurrent] = [finalCurrent, finalOld];
    }
    if (oldNum === curNum) {
      finalOld = null;
    }
  }

  const hasDiscount = Boolean(
    finalOld && finalCurrent && finalOld !== finalCurrent,
  );
  // Image: prefer larger size; eBay default is s-l400, upgrade to s-l1600
  let image = extractImage($, url);
  if (image && image.includes("ebayimg.com")) {
    image = image.replace(/\/s-l\d+\./, "/s-l1600.");
  }

  return {
    title:
      $("h1.x-item-title__mainTitle span.ux-textspans").first().text().trim() ||
      extractTitle($),
    description: extractDescription($),
    image,
    price: hasDiscount ? finalOld : finalCurrent,
    discount_price: hasDiscount ? finalCurrent : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: extractCurrency($, html, url),
  };
}
