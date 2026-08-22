/** Port of `services/scraper/app/extractors/result.py`. */
import { type ExtractionResult, PRODUCT_FIELDS, type ProductData, emptyProduct } from "./types";

/** Python: `{field: source for field, value in product.model_dump().items() if value not in (None, False)}`. */
function sourcesFor(product: ProductData, source: string): Record<string, string> {
  const sources: Record<string, string> = {};
  for (const field of PRODUCT_FIELDS) {
    const value = product[field];
    if (value !== null && value !== false) sources[field] = source;
  }
  return sources;
}

export function extractionOf(
  product: ProductData,
  source: string,
  warnings: string[] = [],
): ExtractionResult {
  return { product, sources: sourcesFor(product, source), warnings };
}

/** Port of `ExtractionResult.merge_missing`. */
export function mergeMissing(target: ExtractionResult, other: ExtractionResult): void {
  for (const field of PRODUCT_FIELDS) {
    if (field === "has_discount") continue;
    const current = target.product[field];
    const candidate = other.product[field];
    if (current === null && candidate !== null) {
      // Field types line up one-to-one; `has_discount` is the only boolean and
      // it is skipped above.
      (target.product as Record<string, unknown>)[field] = candidate;
      const source = other.sources[field];
      if (source) target.sources[field] = source;
    }
  }

  if (other.product.has_discount && !target.product.has_discount) {
    target.product.has_discount = true;
    target.sources.has_discount = other.sources.has_discount ?? "derived";
  }

  target.warnings.push(...other.warnings);
}

export function productFrom(values: Partial<ProductData>): ProductData {
  return { ...emptyProduct(), ...values };
}
