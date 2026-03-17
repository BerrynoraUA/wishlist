import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractPriceFromJSON,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

export function scrapeEbay(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  const currentPriceText =
    $(".x-price-primary").text().trim() ||
    $('[itemprop="price"]').attr("content") ||
    $('[itemprop="price"]').text().trim();

  const oldPriceText =
    $(".x-price-primary")
      .parent()
      .find(".ux-textspans--STRIKETHROUGH")
      .text()
      .trim() ||
    $(".x-additional-info .ux-textspans--STRIKETHROUGH").text().trim() ||
    $('[class*="STRIKETHROUGH"]').first().text().trim() ||
    $(".x-price-was").text().trim();

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

  return {
    title: $("h1.x-item-title__mainTitle").text().trim() || extractTitle($),
    description: extractDescription($),
    image: extractImage($, url),
    price: hasDiscount ? finalOld : finalCurrent,
    discount_price: hasDiscount ? finalCurrent : null,
    has_discount: hasDiscount,
    discount_end_date: null,
  };
}
