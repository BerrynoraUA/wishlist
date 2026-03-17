import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractNumericPrice,
  extractTitle,
  extractDescription,
  extractImage,
} from "../utils";

/**
 * AliExpress product scraper.
 *
 * AliExpress — SPA з SSR, дані товару вбудовані у:
 *   1. window.runParams / window.__INIT_STATE__ (JSON всередині <script>)
 *   2. meta-теги (og:title, og:image, product:price:amount)
 *   3. JSON-LD (рідко, але буває)
 *   4. Видимий текст з цінами у форматі "US $12.34" або "грн.1,234.56"
 */
export function scrapeAliExpress(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // ── 1. DOM-based extraction (найнадійніше) ─────────────────────
  const domPrices = extractPricesFromDOM($);
  const fromScript = extractFromScriptData(html);

  // ── Title ──────────────────────────────────────────────────────
  const rawTitle =
    // DOM: hashed class title component
    $('[class*="title--"] .rc-title-content').text().trim() ||
    $('[class*="components--title"]').attr("title")?.trim() ||
    $('[class*="components--title"] span').text().trim() ||
    // Standard selectors
    $("h1[data-pl='product-title']").text().trim() ||
    $("h1.product-title-text").text().trim() ||
    fromScript.title ||
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    extractTitle($);

  // Очищаємо суфікс " - AliExpress N" з заголовку
  const title = rawTitle
    ? rawTitle.replace(/\s*[-–|]\s*AliExpress.*$/i, "").trim()
    : null;

  // ── Image ──────────────────────────────────────────────────────
  const image =
    fromScript.image ||
    $('meta[property="og:image"]').attr("content") ||
    $(".image-view-magnifier-wrap img").attr("src") ||
    $("img.magnifier-image").attr("src") ||
    extractImage($, url);

  // ── Description ────────────────────────────────────────────────
  const rawDesc =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    fromScript.description ||
    extractDescription($);

  // Очищаємо generic опис AliExpress
  const description =
    rawDesc && !/^Smarter Shopping/i.test(rawDesc) ? rawDesc : null;

  // ── Prices (URL → DOM → meta → script) ────────────────────────
  // URL pdp_npi parameter — найнадійніше джерело, бо AliExpress
  // є SPA і server-side fetch не отримує клієнтський DOM.
  const urlPrices = extractPricesFromUrl(url);

  let currentPrice =
    urlPrices.currentPrice || domPrices.currentPrice || fromScript.currentPrice;
  let oldPrice =
    urlPrices.oldPrice || domPrices.oldPrice || fromScript.oldPrice;

  // Fallback: meta-tags
  if (!currentPrice) {
    const metaPrice =
      $('meta[property="product:price:amount"]').attr("content") ||
      $('meta[property="og:price:amount"]').attr("content");
    if (metaPrice) currentPrice = extractNumericPrice(metaPrice);
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

// ── Extract data from embedded <script> JSON ───────────────────────

interface ScriptData {
  title: string | null;
  image: string | null;
  description: string | null;
  currentPrice: string | null;
  oldPrice: string | null;
}

function extractFromScriptData(html: string): ScriptData {
  const result: ScriptData = {
    title: null,
    image: null,
    description: null,
    currentPrice: null,
    oldPrice: null,
  };

  // Try multiple patterns for embedded JSON data
  const patterns = [
    // window.runParams = {...}
    /window\.runParams\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|window\.)/,
    // data: {...} inside runParams
    /runParams\s*=\s*\{[^}]*"data"\s*:\s*(\{[\s\S]*?\})\s*[,}]/,
    // __INIT_STATE__ (newer layout)
    /window\.__INIT_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    // SSR data
    /window\.__initState__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    try {
      const data = JSON.parse(match[1]);
      parseRunParamsData(data, result);
      if (result.currentPrice) break;
    } catch {
      // JSON may be malformed or truncated — try next pattern
    }
  }

  // Fallback: extract individual fields via targeted regexes
  if (!result.currentPrice) {
    extractPricesFromRawScript(html, result);
  }

  if (!result.title) {
    extractTitleFromRawScript(html, result);
  }

  if (!result.image) {
    extractImageFromRawScript(html, result);
  }

  return result;
}

/**
 * Parse the runParams / init-state JSON object looking for price & product info.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRunParamsData(data: any, result: ScriptData): void {
  if (!data || typeof data !== "object") return;

  // Navigate common nested structures
  const product =
    data.data?.productInfoComponent ??
    data.pageModule ??
    data.priceModule ??
    data.productModule ??
    data;

  // Title
  if (!result.title) {
    result.title =
      dig(data, "subject") ||
      dig(data, "title") ||
      dig(data, "productTitle") ||
      dig(data, "name") ||
      dig(product, "subject") ||
      dig(product, "title");
  }

  // Image
  if (!result.image) {
    result.image =
      dig(data, "imageUrl") ||
      dig(data, "imagePathList", true) ||
      dig(product, "imageUrl") ||
      dig(product, "imagePathList", true);
  }

  // Description
  if (!result.description) {
    result.description =
      dig(data, "description") || dig(product, "description");
  }

  // Prices — look in known locations
  const priceModule =
    data.priceModule ??
    data.data?.priceComponent ??
    data.data?.priceModule ??
    data.price ??
    data;

  // Current (discounted) price
  if (!result.currentPrice) {
    const raw =
      dig(priceModule, "minActivityAmount") ||
      dig(priceModule, "activityAmount") ||
      dig(priceModule, "minAmount") ||
      dig(priceModule, "formattedActivityPrice") ||
      dig(priceModule, "formattedPrice") ||
      dig(priceModule, "price") ||
      dig(priceModule, "salePrice") ||
      dig(data, "minPrice") ||
      dig(data, "salePrice") ||
      dig(data, "price");
    if (raw) result.currentPrice = extractNumericPrice(String(raw));
  }

  // Original (old) price
  if (!result.oldPrice) {
    const raw =
      dig(priceModule, "maxAmount") ||
      dig(priceModule, "formattedOriginalPrice") ||
      dig(priceModule, "originalPrice") ||
      dig(priceModule, "listPrice") ||
      dig(data, "maxPrice") ||
      dig(data, "originalPrice") ||
      dig(data, "listPrice");
    if (raw) result.oldPrice = extractNumericPrice(String(raw));
  }
}

/**
 * Recursively search an object for a key.
 * If `firstArray` is true, return the first element of an array value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dig(obj: any, key: string, firstArray = false): string | null {
  if (!obj || typeof obj !== "object") return null;

  if (key in obj && obj[key] != null) {
    const val = obj[key];
    if (firstArray && Array.isArray(val) && val.length > 0)
      return String(val[0]);
    if (typeof val === "string" || typeof val === "number") return String(val);
  }

  // One level deep only (performance safeguard)
  for (const k of Object.keys(obj)) {
    const child = obj[k];
    if (child && typeof child === "object" && !Array.isArray(child)) {
      if (key in child && child[key] != null) {
        const val = child[key];
        if (firstArray && Array.isArray(val) && val.length > 0)
          return String(val[0]);
        if (typeof val === "string" || typeof val === "number")
          return String(val);
      }
    }
  }

  return null;
}

// ── Regex-based fallbacks for script contents ──────────────────────

function extractPricesFromRawScript(html: string, result: ScriptData): void {
  // Current / sale price
  const salePricePatterns = [
    /"minActivityAmount"\s*:\s*[{"]?(\d+\.?\d*)/,
    /"activityAmount"\s*:\s*[{"]?(\d+\.?\d*)/,
    /"minAmount"\s*:\s*[{"]?(\d+\.?\d*)/,
    /"salePrice"\s*:\s*[{"]?(\d+\.?\d*)/,
    /"formattedActivityPrice"\s*:\s*"[^"]*?([\d,.]+)"/,
    /"formattedPrice"\s*:\s*"[^"]*?([\d,.]+)"/,
    /"price"\s*:\s*"?([\d,.]+)"?/,
  ];

  for (const pattern of salePricePatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const price = extractNumericPrice(match[1]);
      // Мінімальний поріг — відфільтровує хибні значення типу 0.2
      if (price && parseFloat(price) > 1) {
        result.currentPrice = price;
        break;
      }
    }
  }

  // Original price
  const originalPricePatterns = [
    /"maxAmount"\s*:\s*[{"]?(\d+\.?\d*)/,
    /"originalPrice"\s*:\s*[{"]?(\d+\.?\d*)/,
    /"listPrice"\s*:\s*[{"]?(\d+\.?\d*)/,
    /"formattedOriginalPrice"\s*:\s*"[^"]*?([\d,.]+)"/,
  ];

  for (const pattern of originalPricePatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const price = extractNumericPrice(match[1]);
      if (price && parseFloat(price) > 1) {
        result.oldPrice = price;
        break;
      }
    }
  }
}

function extractTitleFromRawScript(html: string, result: ScriptData): void {
  const patterns = [
    /"subject"\s*:\s*"([^"]+)"/,
    /"productTitle"\s*:\s*"([^"]+)"/,
    /"title"\s*:\s*"([^"]{10,200})"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      result.title = match[1].replace(/\\u[\dA-Fa-f]{4}/g, (m) =>
        String.fromCharCode(parseInt(m.slice(2), 16)),
      );
      break;
    }
  }
}

function extractImageFromRawScript(html: string, result: ScriptData): void {
  const patterns = [
    /"imageUrl"\s*:\s*"(https?:\/\/[^"]+)"/,
    /"imagePathList"\s*:\s*\[\s*"(https?:\/\/[^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      result.image = match[1];
      break;
    }
  }
}

// ── DOM price extraction (hashed CSS-module classes) ───────────────

interface DOMPrices {
  currentPrice: string | null;
  oldPrice: string | null;
}

function extractPricesFromDOM($: cheerio.CheerioAPI): DOMPrices {
  const result: DOMPrices = { currentPrice: null, oldPrice: null };

  // ── Current price selectors (від найспецифічніших до загальних) ──
  const currentSelectors = [
    // Hashed CSS-module: price-default--current--HASH
    '[class*="price-default--current"]',
    // Alternative layouts
    '[class*="price--current"]',
    '[class*="uniformBannerBoxPrice"]',
    '[class*="snow-price"] [class*="current"]',
    // Tesla landing page layout
    '[class*="main-info--price-part"] > div > div',
    // Older layouts
    ".product-price-current",
    ".uniform-banner-box-price",
    '[class*="price--sale"]',
  ];

  for (const selector of currentSelectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      const price = extractNumericPrice(text);
      if (price) {
        result.currentPrice = price;
        break;
      }
    }
  }

  // ── Original (strikethrough) price selectors ────────────────────
  const originalSelectors = [
    // Hashed CSS-module: price-default--original--HASH
    '[class*="price-default--original"]',
    '[class*="price--original"]',
    '[class*="price--del"]',
    '[class*="snow-price"] [class*="original"]',
    // Older layouts
    ".product-price-original",
    ".product-price-del",
  ];

  for (const selector of originalSelectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      const price = extractNumericPrice(text);
      if (price) {
        result.oldPrice = price;
        break;
      }
    }
  }

  return result;
}

// ── Extract BOTH prices from URL (pdp_npi parameter) ─────────────
//
// AliExpress URL містить pdp_npi з обома цінами у форматі:
//   6@dis!UAH!грн.10,262.74!грн.7,491.63!!...
// Перша ціна — оригінальна, друга — зі знижкою.

function extractPricesFromUrl(url: string): DOMPrices {
  const result: DOMPrices = { currentPrice: null, oldPrice: null };

  try {
    const decoded = decodeURIComponent(url);

    // Шукаємо pdp_npi параметр
    const npiMatch = decoded.match(/pdp_npi=([^&]+)/);
    if (!npiMatch) return result;

    const npiValue = npiMatch[1];

    // Витягуємо всі ціни з pdp_npi (формат: !валюта.ціна!валюта.ціна!)
    const pricePattern = /(?:US\s*\$|\$|€|£|грн\.?)\s*([\d][\d,.]*\d)/g;
    const prices: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = pricePattern.exec(npiValue)) !== null) {
      const price = extractNumericPrice(match[1]);
      if (price && parseFloat(price) > 1) {
        prices.push(price);
      }
    }

    if (prices.length >= 2) {
      // Перша — оригінальна (вища), друга — зі знижкою (нижча)
      const p1 = parseFloat(prices[0]);
      const p2 = parseFloat(prices[1]);
      if (p1 > p2) {
        result.oldPrice = prices[0];
        result.currentPrice = prices[1];
      } else if (p2 > p1) {
        result.oldPrice = prices[1];
        result.currentPrice = prices[0];
      } else {
        result.currentPrice = prices[0];
      }
    } else if (prices.length === 1) {
      result.currentPrice = prices[0];
    }
  } catch {
    // ignore malformed URL
  }

  return result;
}
