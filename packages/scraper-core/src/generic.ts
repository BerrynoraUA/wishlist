/** Port of `services/scraper/app/extractors/generic.py`. */
import { firstAttribute, firstAttributeOrText, firstText, xpathAll, xpathLiteral } from "./dom";
import { type JsonRecord, isRecord } from "./json";
import {
  cleanText,
  escapeRegExp,
  hostnameOf,
  normalizeCurrency,
  normalizeDiscount,
  normalizeImageUrl,
  normalizePrice,
  pathnameOf,
} from "./normalization";
import { extractionOf, mergeMissing, productFrom } from "./result";
import { type ExtractionResult, emptyExtraction } from "./types";

export function extractGenericProduct(
  document: Document,
  htmlText: string,
  pageUrl: string,
): ExtractionResult {
  if (!htmlText.trim()) {
    return emptyExtraction(["empty_html"]);
  }

  const result = emptyExtraction();
  mergeMissing(result, extractJsonLd(document, pageUrl));
  mergeMissing(result, extractMetaAndDom(document, htmlText, pageUrl));
  mergeMissing(result, extractRegex(htmlText, pageUrl));
  finalizeProduct(result);
  return result;
}

// --------------------------------------------------------------------------
// JSON-LD
// --------------------------------------------------------------------------

function extractJsonLd(document: Document, pageUrl: string): ExtractionResult {
  const result = emptyExtraction();
  const products: JsonRecord[] = [];

  for (const script of jsonLdScripts(document)) {
    let payload: unknown;
    try {
      payload = JSON.parse(script.trim());
    } catch {
      result.warnings.push("malformed_json_ld");
      continue;
    }
    collectProducts(payload, products);
  }

  products.sort(
    (left, right) => jsonLdProductScore(right, pageUrl) - jsonLdProductScore(left, pageUrl),
  );
  for (const product of products) {
    const parsed = productFromJsonLd(product, pageUrl);
    // Python returns the parsed candidate as-is here, dropping the
    // `malformed_json_ld` warnings collected above. Kept identical so the
    // client and server warning lists stay comparable.
    if (parsed.product.title || parsed.product.price || parsed.product.image) {
      return parsed;
    }
  }
  return result;
}

function jsonLdScripts(document: Document): string[] {
  const values = xpathAll(
    document,
    "//script[translate(@type, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', " +
      "'abcdefghijklmnopqrstuvwxyz')='application/ld+json']",
  );
  const texts: string[] = [];
  for (const value of values) {
    const text = typeof value === "string" ? value : value.textContent;
    if (text && text.trim()) texts.push(text);
  }
  return texts;
}

function jsonLdProductScore(item: JsonRecord, pageUrl: string): number {
  const requestedPath = pathnameOf(pageUrl).replace(/\/+$/, "").toLowerCase();
  const identifiers = new Set(requestedPath.match(/[a-z0-9]{5,}/g) ?? []);
  let score = item.offers ? 2 : 0;

  for (const value of [item.url, item["@id"], item.sku, item.productID]) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const candidate = String(value).toLowerCase();
    let candidatePath: string;
    try {
      candidatePath = new URL(candidate).pathname.replace(/\/+$/, "").toLowerCase();
    } catch {
      candidatePath = candidate.replace(/\/+$/, "");
    }
    if (requestedPath && candidatePath === requestedPath) score += 100;
    for (const identifier of identifiers) {
      if (candidate.includes(identifier)) score += 10;
    }
  }
  return score;
}

/** Port of `_iter_products`: walks arrays and `@graph`, keeps `@type: Product`. */
function collectProducts(value: unknown, into: JsonRecord[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectProducts(item, into);
    return;
  }
  if (!isRecord(value)) return;

  const rawType = value["@type"];
  const types = Array.isArray(rawType) ? rawType : [rawType];
  const normalized = new Set(
    types.filter(Boolean).map((item) => String(item).split("/").pop()!.toLowerCase()),
  );
  if (normalized.has("product")) into.push(value);

  if (value["@graph"] !== undefined) collectProducts(value["@graph"], into);
}

function productFromJsonLd(item: JsonRecord, pageUrl: string): ExtractionResult {
  const title = cleanText(item.name);
  const description = cleanText(item.description);
  const image = jsonLdImage(item.image, pageUrl);
  const offers = jsonLdOffers(item.offers);
  const discount = normalizeDiscount(offers.price, offers.discountPrice);

  const product = productFrom({
    title,
    description,
    image,
    price: discount.price,
    discount_price: discount.discountPrice,
    has_discount: discount.hasDiscount,
    discount_end_date: cleanText(offers.validUntil),
    currency: normalizeCurrency(offers.currency) ?? currencyFromJsonLd(item),
  });
  return extractionOf(product, "json_ld");
}

function jsonLdImage(value: unknown, pageUrl: string): string | null {
  let candidate: unknown = Array.isArray(value) ? (value.length ? value[0] : null) : value;
  if (isRecord(candidate)) candidate = candidate.url ?? candidate.contentUrl;
  return normalizeImageUrl(candidate, pageUrl);
}

type OfferValues = {
  price: unknown;
  discountPrice: unknown;
  validUntil: unknown;
  currency: unknown;
};

const REGULAR_PRICE_TYPE = /list|regular|original|retail|msrp|rrp|base|normal/i;
const SALE_PRICE_TYPE = /sale|special|offer|discount|deal|promo|reduced/i;

function jsonLdOffers(offers: unknown): OfferValues {
  const offerList = Array.isArray(offers) ? offers : [offers];
  for (const offer of offerList) {
    if (!isRecord(offer)) continue;

    let currency = offer.priceCurrency;
    let validUntil = offer.priceValidUntil;
    const offerType = String(offer["@type"] ?? "")
      .split("/")
      .pop();

    if (offerType === "AggregateOffer" && offer.lowPrice !== undefined && offer.lowPrice !== null) {
      const low = offer.lowPrice;
      const high = offer.highPrice;
      if (high !== undefined && high !== null && normalizePrice(high) !== normalizePrice(low)) {
        return { price: high, discountPrice: low, validUntil, currency };
      }
      return { price: low, discountPrice: null, validUntil, currency };
    }

    const specifications = offer.priceSpecification;
    const specs = Array.isArray(specifications) ? specifications : [specifications];
    let regular: unknown = null;
    let sale: unknown = null;
    for (const spec of specs) {
      if (!isRecord(spec)) continue;
      const specPrice = spec.price ?? spec.value;
      if (specPrice === undefined || specPrice === null) continue;
      const specType = String(spec["@type"] ?? spec.priceType ?? "");
      if (REGULAR_PRICE_TYPE.test(specType)) {
        regular = specPrice;
      } else if (SALE_PRICE_TYPE.test(specType)) {
        sale = specPrice;
      } else if (sale === null) {
        sale = specPrice;
      }
      validUntil = validUntil ?? spec.validThrough ?? spec.priceValidUntil;
      currency = currency ?? spec.priceCurrency;
    }

    if (regular !== null || sale !== null) {
      return {
        price: regular ?? sale,
        discountPrice: regular && sale ? sale : null,
        validUntil,
        currency,
      };
    }

    const basePrice = offer.price ?? offer.lowPrice;
    const salePrice = offer.salePrice;
    const highPrice = offer.highPrice;
    if (isPresent(salePrice) && isPresent(basePrice)) {
      return { price: basePrice, discountPrice: salePrice, validUntil, currency };
    }
    if (isPresent(highPrice) && isPresent(basePrice)) {
      return { price: highPrice, discountPrice: basePrice, validUntil, currency };
    }
    if (isPresent(basePrice)) {
      return { price: basePrice, discountPrice: null, validUntil, currency };
    }
  }
  return { price: null, discountPrice: null, validUntil: null, currency: null };
}

function currencyFromJsonLd(item: JsonRecord): string | null {
  const direct = normalizeCurrency(item.priceCurrency);
  if (direct) return direct;
  const offers = item.offers;
  const offerList = Array.isArray(offers) ? offers : [offers];
  for (const offer of offerList) {
    if (!isRecord(offer)) continue;
    const currency = normalizeCurrency(offer.priceCurrency);
    if (currency) return currency;
  }
  return null;
}

// --------------------------------------------------------------------------
// Meta + DOM
// --------------------------------------------------------------------------

function extractMetaAndDom(
  document: Document,
  htmlText: string,
  pageUrl: string,
): ExtractionResult {
  const meta = (...names: string[]): string | null => {
    for (const name of names) {
      const literal = xpathLiteral(name.toLowerCase());
      const values = xpathAll(
        document,
        `//meta[translate(@property, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ` +
          `'abcdefghijklmnopqrstuvwxyz')=${literal} or ` +
          `translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ` +
          `'abcdefghijklmnopqrstuvwxyz')=${literal}]/@content`,
        1,
      );
      if (values.length) {
        const value = cleanText(values[0]);
        if (value) return value;
      }
    }
    return null;
  };

  let title = meta("og:title", "twitter:title");
  if (!title) {
    title = firstText(document, ["//*[@itemprop='name'][1]", "//h1[1]", "//title[1]"]);
  }

  let description = meta("og:description", "twitter:description", "description");
  if (!description) {
    description = firstAttributeOrText(document, ["//*[@itemprop='description'][1]"], "content");
  }

  const image = normalizeImageUrl(
    meta("og:image", "og:image:url", "twitter:image", "twitter:image:src") ??
      firstAttribute(
        document,
        ["//*[@itemprop='image'][1]", "//img[contains(@class, 'product')][1]"],
        ["content", "src", "data-src"],
      ),
    pageUrl,
  );

  let currentPriceRaw = meta("product:price:amount", "og:price:amount");
  if (!currentPriceRaw) {
    currentPriceRaw = firstAttributeOrText(
      document,
      [
        "//*[@itemprop='price'][1]",
        "//*[@data-price][1]",
        "//*[contains(@class, 'sale-price')][1]",
        "//*[contains(@class, 'current-price')][1]",
        "//*[contains(@class, 'product-price')][1]",
      ],
      "content",
      "data-price",
    );
  }

  const originalPriceRaw = firstAttributeOrText(
    document,
    [
      "//*[contains(@class, 'old-price')][1]",
      "//*[contains(@class, 'original-price')][1]",
      "//*[contains(@class, 'list-price')][1]",
      "//del[1]",
      "//s[1]",
    ],
    "content",
    "data-price",
  );

  const currentPrice = normalizePrice(currentPriceRaw);
  const originalPrice = normalizePrice(originalPriceRaw);
  const discount =
    originalPrice && currentPrice
      ? normalizeDiscount(originalPrice, currentPrice)
      : { price: currentPrice, discountPrice: null, hasDiscount: false };

  const currency = currencyForPage(
    normalizeCurrency(
      meta("product:price:currency", "og:price:currency") ??
        firstAttributeOrText(document, ["//*[@itemprop='priceCurrency'][1]"], "content") ??
        currencyFromText(htmlText),
    ),
    pageUrl,
  );

  const product = productFrom({
    title,
    description,
    image,
    price: discount.price,
    discount_price: discount.discountPrice,
    has_discount: discount.hasDiscount,
    currency,
  });
  return extractionOf(product, "meta_dom");
}

// --------------------------------------------------------------------------
// Raw regex
// --------------------------------------------------------------------------

function extractRegex(htmlText: string, pageUrl: string): ExtractionResult {
  const metaContent = (name: string): string | null => {
    const escaped = escapeRegExp(name);
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)`, "i"),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
        "i",
      ),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(htmlText);
      if (match) return cleanText(match[1]);
    }
    return null;
  };

  let title = metaContent("og:title");
  if (!title) {
    const match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(htmlText);
    title = match ? cleanText(match[1].replace(/<[^>]+>/g, " ")) : null;
  }

  const description = metaContent("og:description") ?? metaContent("description");
  const image = normalizeImageUrl(metaContent("og:image"), pageUrl);
  let rawPrice = metaContent("product:price:amount") ?? metaContent("og:price:amount");
  // A bare number near the word "price" is common in analytics, login and
  // challenge pages. Only use the broad regex after the page has established
  // a product identity with both a product title and image.
  if (!rawPrice && title && image) {
    const match = /(?:price|amount)[^\d]{0,20}(\d[\d\s.,]{0,20})/i.exec(htmlText);
    rawPrice = match ? match[1] : null;
  }

  const product = productFrom({
    title,
    description,
    image,
    price: normalizePrice(rawPrice),
    currency: currencyForPage(
      normalizeCurrency(
        metaContent("product:price:currency") ??
          metaContent("og:price:currency") ??
          currencyFromText(htmlText),
      ),
      pageUrl,
    ),
  });
  return extractionOf(product, "regex");
}

// --------------------------------------------------------------------------
// Shared helpers
// --------------------------------------------------------------------------

const CURRENCY_TEXT_PATTERNS: readonly [RegExp, string][] = [
  [/\bUAH\b|₴|грн\.?/i, "UAH"],
  [/\bUSD\b|US\$|\$/i, "USD"],
  [/\bEUR\b|€/i, "EUR"],
  [/\bGBP\b|£/i, "GBP"],
  [/\bTRY\b|₺|\bTL\b/i, "TRY"],
  [/\bPLN\b|zł/i, "PLN"],
  [/\bINR\b|₹/i, "INR"],
];

function currencyFromText(text: string): string | null {
  for (const [pattern, currency] of CURRENCY_TEXT_PATTERNS) {
    if (pattern.test(text)) return currency;
  }
  return null;
}

function currencyForPage(currency: string | null, pageUrl: string): string | null {
  const hostname = hostnameOf(pageUrl);
  if (hostname.endsWith("zalora.com.hk") && (currency === null || currency === "USD")) {
    return "HKD";
  }
  return currency;
}

function finalizeProduct(result: ExtractionResult): void {
  const product = result.product;
  product.title = cleanText(product.title);
  product.description = cleanText(product.description);
  product.currency = normalizeCurrency(product.currency);
  product.image = normalizeImageUrl(product.image, "");

  const discount = normalizeDiscount(product.price, product.discount_price);
  product.price = discount.price;
  product.discount_price = discount.discountPrice;
  product.has_discount = discount.hasDiscount;

  if (product.has_discount) {
    result.sources.has_discount = result.sources.has_discount ?? "derived";
  } else {
    product.discount_end_date = null;
    delete result.sources.discount_end_date;
  }
  if (product.discount_price === null) {
    delete result.sources.discount_price;
  }
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null;
}
