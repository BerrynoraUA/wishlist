/**
 * Port of `services/scraper/app/models.py`. Field names are kept identical to
 * the Python service so client and server results can be diffed one-to-one.
 */

export type ProductData = {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
  currency: string | null;
};

export const PRODUCT_FIELDS = [
  "title",
  "description",
  "image",
  "price",
  "discount_price",
  "has_discount",
  "discount_end_date",
  "currency",
] as const satisfies readonly (keyof ProductData)[];

export function emptyProduct(): ProductData {
  return {
    title: null,
    description: null,
    image: null,
    price: null,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: null,
  };
}

export type QualityResult = {
  score: number;
  accepted: boolean;
  warnings: string[];
};

/** Mirrors `ExtractionResult` in `app/extractors/result.py`. */
export type ExtractionResult = {
  product: ProductData;
  sources: Record<string, string>;
  warnings: string[];
};

export function emptyExtraction(warnings: string[] = []): ExtractionResult {
  return { product: emptyProduct(), sources: {}, warnings };
}

export type BlockReason =
  | "http_status"
  | "challenge"
  | "access_denied"
  | "captcha"
  | "empty_response"
  | "soft_block";

export type BlockDecision = {
  blocked: boolean;
  reason: BlockReason | null;
};
