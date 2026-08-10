/** Port of `services/scraper/app/quality.py`. */
import type { ExtractionResult, QualityResult } from "./types";

const BLOCKED_TITLES = new Set([
  "access denied",
  "forbidden",
  "just a moment",
  "page not found",
  "error page | ebay",
  "javascript is disabled",
  "register & sign in - farfetch",
  "cdiscount.com",
  "amazon.com",
]);

export function evaluateQuality(extraction: ExtractionResult): QualityResult {
  const product = extraction.product;
  const warnings = [...new Set(extraction.warnings)];
  let score = 0;

  const title = (product.title ?? "").trim();
  if (title && !BLOCKED_TITLES.has(title.toLowerCase())) {
    score += 25;
  } else if (title) {
    warnings.push("blocked_or_placeholder_title");
  }

  if (validPrice(product.price)) {
    score += 30;
  } else if (product.price !== null) {
    warnings.push("invalid_price");
  }

  if (product.currency) score += 10;
  if (product.image && /^https?:\/\//.test(product.image)) {
    score += 20;
  } else if (product.image) {
    warnings.push("invalid_image");
  }
  if (product.description) score += 5;

  if (hasIndependentConfirmation(extraction)) score += 10;

  const accepted =
    score >= 70 && Boolean(title) && (validPrice(product.price) || Boolean(product.image));

  return {
    score: Math.min(score, 100),
    accepted,
    warnings: [...new Set(warnings)],
  };
}

function validPrice(value: string | null): boolean {
  if (value === null) return false;
  if (!/^\d+(\.\d+)?$/.test(value)) return false;
  return Number.parseFloat(value) > 0;
}

function hasIndependentConfirmation(extraction: ExtractionResult): boolean {
  const sources = new Set(Object.values(extraction.sources));
  return sources.has("json_ld") && (sources.has("meta_dom") || sources.has("regex"));
}
