/** Port of `services/scraper/app/extractors/stores/embedded.py`. */
import { scriptTexts } from "../dom";
import type { JsonRecord } from "../json";
import {
  cleanText,
  hostnameOf,
  normalizeCurrency,
  normalizeImageUrl,
  normalizePrice,
  pathnameOf,
} from "../normalization";
import { extractionOf, productFrom } from "../result";
import { type ExtractionResult, emptyExtraction } from "../types";

const DOMAINS = [
  "lamoda.ru",
  "lazada.",
  "meesho.com",
  "overstock.com",
  "emag.",
  "takealot.com",
  "cdiscount.com",
  "farfetch.com",
];
const TITLE_KEYS = ["title", "name", "productName", "product_name", "displayName"];
const PRICE_KEYS = [
  "salePrice",
  "sale_price",
  "currentPrice",
  "current_price",
  "sellingPrice",
  "selling_price",
  "price",
];
const OLD_PRICE_KEYS = ["originalPrice", "original_price", "listPrice", "mrp", "retailPrice"];
const IMAGE_KEYS = ["image", "imageUrl", "image_url", "mainImage", "main_image", "thumbnail"];
const CURRENCY_KEYS = ["currency", "currencyCode", "priceCurrency"];
const ID_KEYS = ["id", "productId", "product_id", "itemId", "item_id", "sku", "skuId"];

export function supportsEmbeddedStore(pageUrl: string): boolean {
  const hostname = hostnameOf(pageUrl);
  return DOMAINS.some((domain) => hostname.includes(domain));
}

export function extractEmbeddedStore(document: Document, pageUrl: string): ExtractionResult {
  const expectedIds = expectedIdsFor(pageUrl);
  let best: { score: number; item: JsonRecord } | null = null;

  for (const raw of scriptTexts(document)) {
    const payload = decodeScript(raw);
    if (payload === null) continue;
    for (const candidate of walkRecords(payload)) {
      const score = candidateScore(candidate, expectedIds);
      if (score >= 4 && (best === null || score > best.score)) {
        best = { score, item: candidate };
      }
    }
  }

  if (best === null) return emptyExtraction(["embedded_product_state_not_found"]);

  const item = best.item;
  const current = normalizePrice(firstValue(item, PRICE_KEYS));
  const old = normalizePrice(firstValue(item, OLD_PRICE_KEYS));
  const price = old && current && old !== current ? old : current;
  const discount = old && current && old !== current ? current : null;

  const product = productFrom({
    title: cleanText(firstValue(item, TITLE_KEYS)),
    description: cleanText(item.description ?? item.shortDescription),
    image: imageValue(firstValue(item, IMAGE_KEYS), pageUrl),
    price,
    discount_price: discount,
    has_discount: Boolean(discount),
    currency: normalizeCurrency(firstValue(item, CURRENCY_KEYS)),
  });
  return extractionOf(product, "store:embedded_state");
}

function decodeScript(raw: string): unknown {
  const value = raw.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    // Common hydration assignments: window.__STATE__ = {...};
  }
  const match = /(?:^|=)\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*;?\s*$/.exec(value);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function* walkRecords(value: unknown): Generator<JsonRecord> {
  if (Array.isArray(value)) {
    for (const child of value) yield* walkRecords(child);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const record = value as JsonRecord;
  yield record;
  for (const child of Object.values(record)) yield* walkRecords(child);
}

function candidateScore(item: JsonRecord, expectedIds: Set<string>): number {
  let score = firstValue(item, TITLE_KEYS) !== null ? 2 : 0;
  score += firstValue(item, PRICE_KEYS) !== null ? 2 : 0;
  score += firstValue(item, IMAGE_KEYS) !== null ? 1 : 0;

  const candidateIds = new Set<string>();
  for (const key of ID_KEYS) {
    const value = item[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "object") continue;
    candidateIds.add(String(value).toLowerCase());
  }

  if (expectedIds.size) {
    const intersects = [...candidateIds].some((id) => expectedIds.has(id));
    if (intersects) score += 6;
    else if (candidateIds.size) score -= 6;
  }
  return score;
}

function expectedIdsFor(pageUrl: string): Set<string> {
  const path = pathnameOf(pageUrl).toLowerCase();
  const values = new Set<string>();
  for (const match of path.matchAll(/(?:pdp-i|\/p\/|\/pd\/|\/plid|\/item\/|\/)([a-z0-9]{5,})/g)) {
    values.add(match[1]);
  }
  for (const match of path.matchAll(/\b(\d{7,})\b/g)) {
    values.add(match[1]);
  }
  return values;
}

function firstValue(item: JsonRecord, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function imageValue(value: unknown, pageUrl: string): string | null {
  let candidate = value;
  if (Array.isArray(candidate)) candidate = candidate.length ? candidate[0] : null;
  if (typeof candidate === "object" && candidate !== null) {
    const record = candidate as JsonRecord;
    candidate = record.url ?? record.src ?? record.original;
  }
  return normalizeImageUrl(candidate, pageUrl);
}
