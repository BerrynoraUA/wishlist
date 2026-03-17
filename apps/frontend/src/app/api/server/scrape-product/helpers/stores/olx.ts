import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractPriceFromJSON,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

export function scrapeOLX(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  const priceText =
    $('[data-testid="ad-price-container"]').text().trim() ||
    $(".css-90xrc0").text().trim();

  const price = extractNumericPrice(priceText) || extractPriceFromJSON(html);

  return {
    title: $('[data-cy="ad_title"]').text().trim() || extractTitle($),
    description: extractDescription($),
    image: extractImage($, url),
    price: price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
  };
}
