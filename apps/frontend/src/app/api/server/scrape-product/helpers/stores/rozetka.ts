import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractCurrency,
  extractNumericPrice,
  extractPriceFromJSON,
  extractTitle,
  extractDescription,
  extractImage,
  extractDateFromText,
} from "../utils";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function findProductJsonLd(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const product = findProductJsonLd(item);
      if (product) return product;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;

  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
  if (types.includes("Product")) return record;

  return findProductJsonLd(record["@graph"]);
}

function parseJsonLd($: cheerio.CheerioAPI): ProductData | null {
  let product: Record<string, unknown> | null = null;
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const element of scripts) {
    try {
      product = findProductJsonLd(JSON.parse($(element).text()));
      if (product) break;
    } catch {
      // Ignore malformed structured data.
    }
  }

  if (!product) return null;

  const offersValue = product.offers;
  const offer = asRecord(Array.isArray(offersValue) ? offersValue[0] : offersValue);
  const currentPrice = extractNumericPrice(String(offer?.price ?? ""));
  const priceSpecifications = Array.isArray(offer?.priceSpecification)
    ? offer.priceSpecification
    : [offer?.priceSpecification];
  const oldPriceSpecification = priceSpecifications
    .map(asRecord)
    .find((item) => item?.priceType === "https://schema.org/StrikethroughPrice");
  const oldPrice = extractNumericPrice(String(oldPriceSpecification?.price ?? ""));
  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);
  const imageValue = Array.isArray(product.image) ? product.image[0] : product.image;

  return {
    title: typeof product.name === "string" ? product.name : null,
    description: typeof product.description === "string" ? product.description : null,
    image: typeof imageValue === "string" ? imageValue : null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: typeof offer?.priceValidUntil === "string" ? offer.priceValidUntil : null,
    currency: typeof offer?.priceCurrency === "string" ? offer.priceCurrency : null,
  };
}

function parseRozetka(html: string, url: string): ProductData {
  const $ = cheerio.load(html);
  const jsonLdProduct = parseJsonLd($);
  if (jsonLdProduct?.price) return jsonLdProduct;

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

  const currentPrice = extractNumericPrice(currentPriceText) || extractPriceFromJSON(html);
  const oldPrice = extractNumericPrice(oldPriceText);

  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);

  const promoEndText = $('[class*="promo-end"], [class*="timer"], [data-testid="promotion-end"]')
    .text()
    .trim();
  const discountEndDate = extractDateFromText(promoEndText);
  return {
    title: $("h1.product__title").text().trim() || extractTitle($),
    description: extractDescription($),
    image: $('meta[property="og:image"]').attr("content") || extractImage($, url),
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: discountEndDate,
    currency: extractCurrency($, html, url),
  };
}

export function scrapeRozetka(html: string, url: string): ProductData {
  return parseRozetka(html, url);
}
