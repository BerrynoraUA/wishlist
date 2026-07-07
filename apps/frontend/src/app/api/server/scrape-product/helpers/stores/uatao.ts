import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractDescription, extractNumericPrice } from "../utils";

function normalizeImage(value: string | undefined, baseUrl: string): string | null {
  if (!value) return null;

  const repaired = value.trim().replace(/^(https?):(?:https?:)+\/\//i, "$1://");
  try {
    return new URL(repaired, baseUrl).href;
  } catch {
    return null;
  }
}

export function scrapeUaTao(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  const rawTitle =
    $("main h1").first().text().trim() ||
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    null;
  const title = rawTitle?.replace(/\s*-\s*[\d\s.,]+\s*грн\.?\s*$/i, "").trim() || null;

  const currentPrice = extractNumericPrice(
    $("#price").first().text().trim() || $('input[name="price"]').first().attr("value") || "",
  );
  const image = normalizeImage(
    $("#image-slider img").first().attr("src") ||
      $('script[type="application/ld+json"]')
        .first()
        .text()
        .match(/"image"\s*:\s*"([^"]+)"/)?.[1],
    url,
  );

  return {
    title,
    description:
      $('meta[property="og:description"]').attr("content")?.trim() || extractDescription($),
    image,
    price: currentPrice,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: currentPrice ? "UAH" : null,
  };
}
