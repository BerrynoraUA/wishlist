import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice } from "../utils";

export function scrapeZalando(html: string, url: string): ProductData {
  const $ = cheerio.load(html);
  const rawTitle = $('meta[property="og:title"]').attr("content")?.trim() || null;
  const title = rawTitle?.replace(/\s*-\s*Zalando\.[a-z.]+\s*$/i, "").trim() || null;
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;
  const image = $('meta[property="og:image"]').attr("content")?.trim() || null;
  const structuredPrice =
    $('[itemprop="price"]').first().attr("content") ||
    $('meta[property="product:price:amount"]').first().attr("content") ||
    "";
  const descriptionPrice = description?.match(/\bpre\s+([\d,.]+)\s*(?:€|EUR)/i)?.[1] || "";
  const price = extractNumericPrice(structuredPrice || descriptionPrice);

  return {
    title,
    description,
    image: image ? new URL(image, url).href : null,
    price,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: price ? "EUR" : null,
  };
}
