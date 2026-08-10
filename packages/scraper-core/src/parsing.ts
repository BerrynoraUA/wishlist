/** Port of `services/scraper/app/parsing.py`. */
import { parseHtml } from "./dom";
import { extractGenericProduct } from "./generic";
import { hostnameOf } from "./normalization";
import { evaluateQuality } from "./quality";
import { mergeMissing } from "./result";
import { extractStoreProduct } from "./stores/registry";
import { PRODUCT_FIELDS, type ExtractionResult, type QualityResult } from "./types";

export type ParseOutcome = {
  extraction: ExtractionResult;
  quality: QualityResult;
};

/**
 * Parses an already-fetched page. `document` is either a live `WebView`
 * document or one produced by `DOMParser`; `htmlText` is the matching source
 * used by the regex-only passes.
 */
export function parseProductDocument(
  document: Document,
  htmlText: string,
  pageUrl: string,
): ParseOutcome {
  const storeExtraction = extractStoreProduct(document, htmlText, pageUrl);
  const genericExtraction = extractGenericProduct(document, htmlText, pageUrl);

  let extraction: ExtractionResult;
  if (storeExtraction === null) {
    extraction = genericExtraction;
  } else {
    const blockedMergeFields = new Set(
      storeExtraction.warnings
        .filter((warning) => warning.startsWith("do_not_merge:"))
        .map((warning) => warning.slice("do_not_merge:".length)),
    );
    for (const field of blockedMergeFields) {
      if ((PRODUCT_FIELDS as readonly string[]).includes(field)) {
        (genericExtraction.product as Record<string, unknown>)[field] = null;
        delete genericExtraction.sources[field];
      }
    }
    extraction = storeExtraction;
    mergeMissing(extraction, genericExtraction);
  }

  removeStorePlaceholders(extraction, pageUrl);
  return { extraction, quality: evaluateQuality(extraction) };
}

/** Convenience wrapper that parses an HTML string (used by the fetch tier). */
export function parseProductHtml(htmlText: string, pageUrl: string): ParseOutcome {
  return parseProductDocument(parseHtml(htmlText), htmlText, pageUrl);
}

const PLACEHOLDER_TITLES: Record<string, string[]> = {
  "aliexpress.": ["aliexpress", "aliexpress.com"],
  "ebay.": ["error page | ebay"],
  "emag.": ["javascript is disabled"],
  "takealot.com": ["takealot.com: online shopping | sa's leading online store"],
  "cdiscount.com": ["cdiscount.com"],
  "farfetch.com": ["register & sign in - farfetch", "register &amp; sign in - farfetch"],
};

function removeStorePlaceholders(extraction: ExtractionResult, pageUrl: string): void {
  const hostname = hostnameOf(pageUrl);
  const title = (extraction.product.title ?? "").trim().toLowerCase();
  const matchedDomain = Object.keys(PLACEHOLDER_TITLES).find((domain) => hostname.includes(domain));

  if (matchedDomain && PLACEHOLDER_TITLES[matchedDomain].includes(title)) {
    for (const field of PRODUCT_FIELDS) {
      (extraction.product as Record<string, unknown>)[field] =
        field === "has_discount" ? false : null;
      delete extraction.sources[field];
    }
    extraction.warnings.push(`${matchedDomain.replace(/\.+$/, "")}_non_product_page`);
    return;
  }

  const description = (extraction.product.description ?? "").trim();
  if (
    hostname.includes("aliexpress.") &&
    description.toLowerCase().startsWith("smarter shopping")
  ) {
    extraction.product.description = null;
    delete extraction.sources.description;
    extraction.warnings.push("aliexpress_placeholder_description");
  }
}
