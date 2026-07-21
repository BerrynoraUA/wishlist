import * as cheerio from "cheerio";
import { emptyProduct, type ScraperMethod } from "../types";

const titleKeys = ["title", "name", "productName", "product_name", "displayName"];
const priceKeys = ["salePrice", "sale_price", "currentPrice", "sellingPrice", "price"];
const oldPriceKeys = ["originalPrice", "original_price", "listPrice", "mrp", "retailPrice"];
const imageKeys = ["image", "imageUrl", "image_url", "mainImage", "thumbnail"];
const idKeys = ["id", "productId", "product_id", "itemId", "item_id", "sku", "skuId"];

export const scrapeStructuredMarketplace: ScraperMethod = (html, url) => {
  const $ = cheerio.load(html);
  const expectedIds = new Set(new URL(url).pathname.toLowerCase().match(/[a-z0-9]{5,}/g) ?? []);
  let best: { score: number; value: Record<string, unknown> } | null = null;

  $("script").each((_, element) => {
    const raw = $(element).text().trim();
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      const match = raw.match(/(?:^|=)\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*;?\s*$/);
      if (!match) return;
      try {
        payload = JSON.parse(match[1]);
      } catch {
        return;
      }
    }
    walk(payload, (value) => {
      const score = candidateScore(value, expectedIds);
      if (score >= 4 && (!best || score > best.score)) best = { score, value };
    });
  });

  if (!best) return emptyProduct();
  const selected = best as { score: number; value: Record<string, unknown> };
  const candidate = selected.value;
  const title = text(first(candidate, titleKeys));
  const current = price(first(candidate, priceKeys));
  const old = price(first(candidate, oldPriceKeys));
  const rawImage = first(candidate, imageKeys);
  const imageValue = Array.isArray(rawImage) ? rawImage[0] : rawImage;
  const image =
    typeof imageValue === "string"
      ? new URL(imageValue, url).href
      : imageValue && typeof imageValue === "object"
        ? text((imageValue as Record<string, unknown>).url)
        : null;
  const hasDiscount = Boolean(old && current && old !== current);
  return {
    title,
    description: text(candidate.description ?? candidate.shortDescription),
    image,
    price: hasDiscount ? old : current,
    discount_price: hasDiscount ? current : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: text(candidate.currency ?? candidate.currencyCode ?? candidate.priceCurrency),
  };
};

function walk(value: unknown, visit: (value: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    value.forEach((child) => walk(child, visit));
  } else if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    visit(object);
    Object.values(object).forEach((child) => walk(child, visit));
  }
}

function candidateScore(value: Record<string, unknown>, expected: Set<string>): number {
  let score = first(value, titleKeys) ? 2 : 0;
  score += first(value, priceKeys) ? 2 : 0;
  score += first(value, imageKeys) ? 1 : 0;
  const ids = idKeys
    .map((key) => value[key])
    .filter((item): item is string | number => ["string", "number"].includes(typeof item))
    .map((item) => String(item).toLowerCase());
  if (ids.some((id) => expected.has(id))) score += 6;
  else if (expected.size && ids.length) score -= 6;
  return score;
}

function first(value: Record<string, unknown>, keys: string[]): unknown {
  return keys
    .map((key) => value[key])
    .find((item) => item !== null && item !== undefined && item !== "");
}

function text(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim() || null
    : null;
}

function price(value: unknown): string | null {
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    value = object.amount ?? object.value ?? object.price;
  }
  const normalized = text(value)
    ?.replace(/[^\d.,]/g, "")
    .replace(/,/g, "");
  return normalized || null;
}
