/**
 * Port of `services/scraper/app/extractors/stores/registry.py`, plus the two
 * HTML-only extractors that live in `enrichment.py` (`extract_rozetka_html`,
 * `extract_shopgoodwill_html`).
 */
import { selectValue, xpathFirst } from "../dom";
import { isRecord } from "../json";
import {
  cleanText,
  hostnameOf,
  normalizeCurrency,
  normalizeDiscount,
  normalizeImageUrl,
  normalizePrice,
} from "../normalization";
import { extractionOf, productFrom } from "../result";
import { type ExtractionResult, emptyExtraction } from "../types";
import {
  type ComplexExtractor,
  attributeFrom,
  extractAliexpress,
  extractAmazon,
  extractAsos,
  extractFlipkart,
  extractFoxtrot,
  extractN11,
  extractTarget,
  extractTrendyol,
  extractZalando,
} from "./complex";
import { extractEmbeddedStore, supportsEmbeddedStore } from "./embedded";
import { DEFAULT_FIELD_ATTRIBUTES, type FieldRule, PROFILES, type StoreProfile } from "./profiles";

const COMPLEX_EXTRACTORS: readonly (readonly [string, ComplexExtractor])[] = [
  ["amazon.", extractAmazon],
  ["aliexpress.", extractAliexpress],
  ["asos.com", extractAsos],
  ["foxtrot.com.ua", extractFoxtrot],
  ["n11.com", extractN11],
  ["target.com", extractTarget],
  ["flipkart.com", extractFlipkart],
  ["trendyol.com", extractTrendyol],
  ["zalando.", extractZalando],
  ["rozetka.com.ua", extractRozetkaHtml],
  ["shopgoodwill.com", extractShopgoodwillHtml],
];

function getStoreProfile(pageUrl: string): StoreProfile | null {
  const hostname = hostnameOf(pageUrl);
  return (
    PROFILES.find((profile) => profile.patterns.some((pattern) => hostname.includes(pattern))) ??
    null
  );
}

export function extractStoreProduct(
  document: Document,
  htmlText: string,
  pageUrl: string,
): ExtractionResult | null {
  const hostname = hostnameOf(pageUrl);

  if (supportsEmbeddedStore(pageUrl)) {
    const embedded = extractEmbeddedStore(document, pageUrl);
    if (embedded.product.title || embedded.product.price || embedded.product.image) {
      return embedded;
    }
  }

  for (const [pattern, extractor] of COMPLEX_EXTRACTORS) {
    if (hostname.includes(pattern)) return extractor(document, htmlText, pageUrl);
  }

  if (hostname.includes("bandcamp.com")) return extractBandcamp(document, htmlText, pageUrl);

  const profile = getStoreProfile(pageUrl);
  if (profile === null) return null;
  return extractProfile(profile, document, htmlText, pageUrl);
}

function select(document: Document, rule: FieldRule | undefined): string | null {
  if (!rule) return null;
  return selectValue(document, rule.xpaths, rule.attributes ?? DEFAULT_FIELD_ATTRIBUTES);
}

function extractProfile(
  profile: StoreProfile,
  document: Document,
  htmlText: string,
  pageUrl: string,
): ExtractionResult {
  let title = select(document, profile.title);
  if (title) {
    for (const pattern of profile.titleCleanup ?? []) {
      title = title.replace(resetRegex(pattern), "").trim();
    }
  }
  if (
    title &&
    (profile.blockedTitles ?? []).some((blocked) => title!.toLowerCase().includes(blocked))
  ) {
    return emptyExtraction([`${profile.name}_blocked_page`]);
  }

  let currentPrice = normalizePrice(select(document, profile.currentPrice));
  if (!currentPrice) currentPrice = firstRegexPrice(htmlText, profile.currentPriceRegex);

  let oldPrice = profile.oldPrice ? normalizePrice(select(document, profile.oldPrice)) : null;
  if (!oldPrice) oldPrice = firstRegexPrice(htmlText, profile.oldPriceRegex);

  const discount =
    oldPrice && currentPrice
      ? normalizeDiscount(oldPrice, currentPrice)
      : { price: currentPrice, discountPrice: null, hasDiscount: false };

  let currency = profile.currency ? normalizeCurrency(select(document, profile.currency)) : null;
  if (!currency && profile.currencyRegex) {
    const match = resetRegex(profile.currencyRegex).exec(htmlText);
    currency = match ? normalizeCurrency(match[1]) : null;
  }
  if (!currency && discount.price) currency = profile.defaultCurrency ?? null;

  let image = profile.image ? normalizeImageUrl(select(document, profile.image), pageUrl) : null;
  if (image) {
    for (const [pattern, replacement] of profile.imageReplacements ?? []) {
      image = image.replace(resetRegex(pattern), replacement);
    }
  }

  const product = productFrom({
    title: cleanText(title),
    description: profile.description ? cleanText(select(document, profile.description)) : null,
    image,
    price: discount.price,
    discount_price: discount.discountPrice,
    has_discount: discount.hasDiscount,
    currency,
  });
  return extractionOf(product, `store:${profile.name}`);
}

// --------------------------------------------------------------------------
// Bandcamp
// --------------------------------------------------------------------------

function extractBandcamp(document: Document, htmlText: string, pageUrl: string): ExtractionResult {
  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;
  let price: string | null = null;
  let currency: string | null = null;

  const scripts = document.querySelectorAll("script[type='application/ld+json']");
  for (const script of Array.from(scripts)) {
    let payload: unknown;
    try {
      payload = JSON.parse(script.textContent ?? "");
    } catch {
      continue;
    }
    if (!isRecord(payload)) continue;
    const type = payload["@type"];
    if (type !== "MusicAlbum" && type !== "MusicRecording") continue;

    title = cleanText(payload.name);
    description = cleanText(payload.description);
    if (description) {
      description = description.replace(/^PREVIEWS:\s*https?:\/\/\S+\s*/i, "");
    }
    const rawImage = payload.image;
    if (typeof rawImage === "string") {
      image = normalizeImageUrl(rawImage.replace(/_\d+(\.\w+)$/, "_10$1"), pageUrl);
    }

    const releases = Array.isArray(payload.albumRelease) ? payload.albumRelease : [];
    for (const release of releases) {
      if (!isRecord(release)) continue;
      const offers = release.offers;
      const offerList = Array.isArray(offers) ? offers : [offers];
      for (const offer of offerList) {
        if (isRecord(offer) && offer.price !== undefined && offer.price !== null) {
          price = normalizePrice(offer.price);
          currency = normalizeCurrency(offer.priceCurrency);
          break;
        }
      }
      if (price) break;
    }
    break;
  }

  if (!price) {
    const match = /"minimum_price"\s*:\s*([\d.]+)/.exec(htmlText);
    price = match ? normalizePrice(match[1]) : null;
  }

  const product = productFrom({ title, description, image, price, currency });
  return extractionOf(product, "store:bandcamp");
}

// --------------------------------------------------------------------------
// Rozetka / ShopGoodwill (HTML halves of `enrichment.py`)
// --------------------------------------------------------------------------

function extractRozetkaHtml(
  document: Document,
  _htmlText: string,
  pageUrl: string,
): ExtractionResult {
  const current = enrichmentPrice(document, [
    "//*[contains(@class,'product-price__big')][1]",
    "//*[@data-testid='price'][1]",
    "//*[@itemprop='price'][1]",
  ]);
  const old = enrichmentPrice(document, [
    "//*[contains(@class,'product-price__small')][1]",
    "//*[contains(@class,'old-price')][1]",
    "//*[contains(@class,'price--old')][1]",
  ]);
  const discount =
    old && current
      ? normalizeDiscount(old, current)
      : { price: current, discountPrice: null, hasDiscount: false };

  const product = productFrom({
    title: enrichmentText(document, ["//h1[contains(@class,'product__title')][1]", "//h1[1]"]),
    description: attributeFrom(
      document,
      ["//meta[@property='og:description']", "//meta[@name='description']"],
      ["content"],
    ),
    image: normalizeImageUrl(
      attributeFrom(document, ["//meta[@property='og:image']"], ["content"]),
      pageUrl,
    ),
    price: discount.price,
    discount_price: discount.discountPrice,
    has_discount: discount.hasDiscount,
    currency: discount.price ? "UAH" : null,
  });
  return extractionOf(product, "store:rozetka");
}

function extractShopgoodwillHtml(
  document: Document,
  htmlText: string,
  pageUrl: string,
): ExtractionResult {
  let title =
    attributeFrom(document, ["//meta[@property='og:title']"], ["content"]) ??
    enrichmentText(document, ["//title", "//h1[1]"]);
  if (title) title = title.replace(/^(?:Used|New|Like New|Pre-Owned)\s+/i, "");

  let price: string | null = null;
  for (const pattern of [
    /"currentPrice"\s*:\s*([\d.]+)/i,
    /"minimumBid"\s*:\s*([\d.]+)/i,
    /"startingBid"\s*:\s*([\d.]+)/i,
    /"buyNowPrice"\s*:\s*([\d.]+)/i,
  ]) {
    const match = pattern.exec(htmlText);
    if (!match) continue;
    price = normalizePrice(match[1]);
    if (price) break;
  }

  const product = productFrom({
    title: cleanText(title),
    description: attributeFrom(
      document,
      ["//meta[@property='og:description']", "//meta[@name='description']"],
      ["content"],
    ),
    image: normalizeImageUrl(
      (attributeFrom(document, ["//meta[@property='og:image']"], ["content"]) ?? "")
        .split("\\")
        .join("/"),
      pageUrl,
    ),
    price,
    currency: price ? "USD" : null,
  });
  return extractionOf(product, "store:shopgoodwill_html");
}

/** Port of `enrichment.py::_text` — text content only, no `content` attribute. */
function enrichmentText(document: Document, expressions: readonly string[]): string | null {
  for (const expression of expressions) {
    const node = xpathFirst(document, expression);
    if (node === null) continue;
    const value = cleanText(typeof node === "string" ? node : node.textContent);
    if (value) return value;
  }
  return null;
}

/** Port of `enrichment.py::_price` — `content`, then `value`, then text. */
function enrichmentPrice(document: Document, expressions: readonly string[]): string | null {
  for (const expression of expressions) {
    const node = xpathFirst(document, expression);
    if (node === null) continue;
    const raw =
      typeof node === "string"
        ? node
        : node.getAttribute("content") || node.getAttribute("value") || node.textContent;
    const price = normalizePrice(raw);
    if (price) return price;
  }
  return null;
}

// --------------------------------------------------------------------------

function firstRegexPrice(htmlText: string, patterns: readonly RegExp[] | undefined): string | null {
  for (const pattern of patterns ?? []) {
    const match = resetRegex(pattern).exec(htmlText);
    if (!match) continue;
    const price = normalizePrice(match[1]);
    if (price) return price;
  }
  return null;
}

/** Fresh instance so a shared `g`-flagged literal never carries `lastIndex`. */
function resetRegex(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}
