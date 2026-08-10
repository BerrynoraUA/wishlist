/**
 * Port of `_has_any_product_data` / `_has_usable_product_data` in
 * `services/scraper/app/service.py`.
 */
import type { ProductData } from "./types";

const PLACEHOLDER_MARKERS = [
  "access denied",
  "forbidden",
  "just a moment",
  "page not found",
  "cannot be found",
  "online shopping |",
  "amazon.com",
  "javascript is disabled",
  "verify you are human",
];

export function hasAnyProductData(product: ProductData): boolean {
  return Boolean(product.title || product.image || product.price || product.description);
}

export function hasUsableProductData(product: ProductData): boolean {
  if (product.price) return true;
  if (product.image && /^https?:\/\//.test(product.image)) return true;
  const title = (product.title ?? "").trim().toLowerCase();
  if (!title) return false;
  return !PLACEHOLDER_MARKERS.some((marker) => title.includes(marker));
}
