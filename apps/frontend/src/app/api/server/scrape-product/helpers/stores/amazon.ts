import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

/**
 * Amazon product scraper.
 *
 * Ціна на Amazon може бути розміщена у кількох місцях:
 *   1. span.a-price  .a-offscreen  (візуально прихований, але містить повну ціну)
 *   2. input#twister-plus-price-data-price  (hidden input)
 *   3. #priceblock_ourprice / #priceblock_dealprice
 *   4. span[data-a-color="price"]  .a-offscreen
 *
 * Знижка:
 *   - Зачеркнута (list) ціна: span.a-text-price[data-a-strike="true"]  .a-offscreen
 *     або  #basisPrice  .a-offscreen
 *   - Savings:  #savingsPercentage  або  .savingsPercentage
 */
export function scrapeAmazon(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // ── Current (buy-box) price ────────────────────────────────────
  const currentPriceText =
    // Primary buy-box price
    $(
      "#corePrice_feature_div span.a-price.apex-pricetopay-value span.a-offscreen",
    )
      .first()
      .text()
      .trim() ||
    // Fallback: any priceToPay
    $("span.priceToPay span.a-offscreen").first().text().trim() ||
    // Deal price
    $("#priceblock_dealprice").text().trim() ||
    $("#dealprice_feature_div span.a-offscreen").first().text().trim() ||
    // Our price (older layout)
    $("#priceblock_ourprice").text().trim() ||
    // Sale price (another layout)
    $("#priceblock_saleprice").text().trim() ||
    // Generic core-price section
    $("#corePrice_feature_div span.a-price span.a-offscreen")
      .first()
      .text()
      .trim() ||
    // Apex price block
    $("span.a-price[data-a-color='base'] span.a-offscreen")
      .first()
      .text()
      .trim() ||
    // Hidden input fallback
    $("#twister-plus-price-data-price").val()?.toString() ||
    "";

  // ── Old / list price (strikethrough) ───────────────────────────
  const oldPriceText =
    // Strike-through price
    $(
      "#corePrice_feature_div span.a-price[data-a-strike='true'] span.a-offscreen",
    )
      .first()
      .text()
      .trim() ||
    // basisPrice block
    $("#basisPrice span.a-price span.a-offscreen").first().text().trim() ||
    // Typical list price
    $("span.a-text-price[data-a-strike='true'] span.a-offscreen")
      .first()
      .text()
      .trim() ||
    // Older layout
    $("#priceblock_ourprice_lbl")
      .parent()
      .find("span.a-text-price span.a-offscreen")
      .first()
      .text()
      .trim() ||
    // Was-price label
    $("span.priceBlockStrikePriceString").text().trim() ||
    // List price row
    $(".a-text-price .a-offscreen").first().text().trim() ||
    "";

  // ── Parse ──────────────────────────────────────────────────────
  let currentPrice = extractNumericPrice(currentPriceText);
  let oldPrice = extractNumericPrice(oldPriceText);

  // Fallback: try JSON-LD / meta tags
  if (!currentPrice) {
    currentPrice = extractPriceFromMeta($) || extractPriceFromJsonLd(html);
  }

  // Validate: old must be > current
  if (oldPrice && currentPrice) {
    const oldNum = parseFloat(oldPrice);
    const curNum = parseFloat(currentPrice);
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

  // ── Title ──────────────────────────────────────────────────────
  const title =
    $("#productTitle").text().trim() ||
    $("h1.product-title-word-break").text().trim() ||
    extractTitle($);

  // ── Image ──────────────────────────────────────────────────────
  const image =
    $("#landingImage").attr("src") ||
    $("#imgBlkFront").attr("src") ||
    $("#main-image").attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    extractImage($, url);

  // ── Description ────────────────────────────────────────────────
  const description =
    $("#feature-bullets ul").text().replace(/\s+/g, " ").trim() ||
    $("#productDescription p").text().trim() ||
    extractDescription($);

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function extractPriceFromMeta($: cheerio.CheerioAPI): string | null {
  const content =
    $('meta[itemprop="price"]').attr("content") ||
    $('meta[property="product:price:amount"]').attr("content") ||
    $('meta[property="og:price:amount"]').attr("content");
  return content ? extractNumericPrice(content) : null;
}

function extractPriceFromJsonLd(html: string): string | null {
  const jsonLdPattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const price = findPriceInObject(data);
      if (price) return price;
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return null;
}

function findPriceInObject(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findPriceInObject(item);
      if (result) return result;
    }
    return null;
  }

  const record = obj as Record<string, unknown>;

  // Check offers.price or price directly
  if (typeof record.price === "number" || typeof record.price === "string") {
    const p = extractNumericPrice(String(record.price));
    if (p) return p;
  }

  if (record.offers) {
    const result = findPriceInObject(record.offers);
    if (result) return result;
  }

  if (record.lowPrice) {
    const p = extractNumericPrice(String(record.lowPrice));
    if (p) return p;
  }

  return null;
}
