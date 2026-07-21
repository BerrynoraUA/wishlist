import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice, extractImage, extractDescription } from "../utils";

/**
 * Target.com — ціни зберігаються в __TGT_DATA__ JSON, не в DOM-елементах.
 */
export async function scrapeTarget(html: string, url: string): Promise<ProductData> {
  const $ = cheerio.load(html);
  const selectedTcin = new URL(url).searchParams.get("preselect");

  // --- title ---
  let title =
    $('h1[data-test="product-title"]').text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    null;

  // --- image ---
  const image =
    $('meta[property="og:image"]').attr("content")?.trim() || extractImage($, url) || null;

  // --- description ---
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() || extractDescription($) || null;

  // --- price from __TGT_DATA__ JSON ---
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;

  const scopedHtml = selectedTcin
    ? [...html.matchAll(new RegExp(selectedTcin, "g"))]
        .map(({ index = 0 }) => html.slice(Math.max(0, index - 8000), index + 8000))
        .join("\n")
    : "";

  currentPrice = extractNumericPrice(
    $('[data-test="product-price"], [data-test="product-price-primary"]').first().text().trim(),
  );

  // Product state must be scoped to the TCIN selected by `preselect`.
  const currentMatch = scopedHtml.match(/"current_retail(?:_min)?"\s*:\s*([\d.]+)/);
  if (currentMatch) {
    currentPrice = extractNumericPrice(currentMatch[1]);
  }
  // formatted_current_price fallback
  if (!currentPrice) {
    const fmtMatch = scopedHtml.match(/"formatted_current_price"\s*:\s*"([^"]+)"/);
    if (fmtMatch) {
      currentPrice = extractNumericPrice(fmtMatch[1]);
    }
  }

  // reg_retail or reg_retail_max (original price)
  oldPrice = extractNumericPrice(
    $('[data-test="product-regular-price"], [class*="strikethrough"]').first().text().trim(),
  );
  const regMatch = scopedHtml.match(/"reg_retail(?:_max)?"\s*:\s*([\d.]+)/);
  if (regMatch) {
    oldPrice = extractNumericPrice(regMatch[1]);
  }
  if (!oldPrice) {
    const fmtRegMatch = scopedHtml.match(/"formatted_comparison_price"\s*:\s*"([^"]+)"/);
    if (fmtRegMatch) {
      oldPrice = extractNumericPrice(fmtRegMatch[1]);
    }
  }

  // Normalize discount
  if (oldPrice && currentPrice) {
    const oldNum = parseFloat(oldPrice);
    const curNum = parseFloat(currentPrice);
    if (oldNum < curNum) [oldPrice, currentPrice] = [currentPrice, oldPrice];
    if (oldNum === curNum) oldPrice = null;
  }

  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);

  const product: ProductData = {
    title: title || null,
    description: description || null,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: currentPrice ? "USD" : null,
  };

  const apiKey = html.match(/apiKey(?:\\?")?\s*:\\?"([a-f0-9]{32,})/i)?.[1];
  if (!selectedTcin || !apiKey) return product;

  try {
    const endpoint =
      "https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1" +
      `?key=${apiKey}&tcin=${selectedTcin}` +
      "&store_id=3991&pricing_store_id=3991&has_pricing_store_id=true";
    const response = await fetch(endpoint, { headers: { Referer: url } });
    if (!response.ok) return product;
    const payload: unknown = await response.json();

    const findSelected = (value: unknown): Record<string, unknown> | null => {
      if (!value || typeof value !== "object") return null;
      if (Array.isArray(value)) {
        for (const child of value) {
          const found = findSelected(child);
          if (found) return found;
        }
        return null;
      }
      const record = value as Record<string, unknown>;
      if (
        String(record.tcin) === selectedTcin &&
        record.price &&
        typeof record.price === "object"
      ) {
        return record;
      }
      for (const child of Object.values(record)) {
        const found = findSelected(child);
        if (found) return found;
      }
      return null;
    };

    const selectedProduct = findSelected(payload);
    const priceData = selectedProduct?.price as Record<string, unknown> | undefined;
    const apiCurrent = extractNumericPrice(String(priceData?.current_retail ?? ""));
    const apiRegular = extractNumericPrice(String(priceData?.reg_retail ?? ""));
    if (!apiCurrent) return product;
    const apiHasDiscount = Boolean(apiRegular && parseFloat(apiRegular) > parseFloat(apiCurrent));
    product.price = apiHasDiscount ? apiRegular : apiCurrent;
    product.discount_price = apiHasDiscount ? apiCurrent : null;
    product.has_discount = apiHasDiscount;
    product.currency = "USD";
    return product;
  } catch {
    return product;
  }
}
