/** Port of `services/scraper/app/extractors/stores/complex.py`. */
import { xpathFirst } from "../dom";
import { isRecord } from "../json";
import {
  cleanText,
  escapeRegExp,
  normalizeCurrency,
  normalizeDiscount,
  normalizeImageUrl,
  normalizePrice,
  pathnameOf,
} from "../normalization";
import { extractionOf, productFrom } from "../result";
import type { ExtractionResult } from "../types";

export type ComplexExtractor = (
  document: Document,
  htmlText: string,
  pageUrl: string,
) => ExtractionResult;

// --------------------------------------------------------------------------
// Amazon
// --------------------------------------------------------------------------

export const extractAmazon: ComplexExtractor = (document, htmlText, pageUrl) => {
  let current = priceFromXpaths(document, [
    "//*[@id='corePrice_feature_div']//*[contains(@class,'a-price') and " +
      "not(@data-a-strike='true')]//*[contains(@class,'a-offscreen')][1]",
    "//*[@id='corePrice_feature_div']//*[contains(@class,'apex-pricetopay-value')]" +
      "//*[@aria-hidden='true'][1]",
    "//*[@id='corePriceDisplay_desktop_feature_div']//*[contains(@class,'a-offscreen')][1]",
    "//*[contains(@class,'priceToPay')]//*[contains(@class,'a-offscreen')][1]",
    "//*[@id='price_inside_buybox']",
    "//*[@id='priceblock_dealprice']",
    "//*[@id='priceblock_ourprice']",
    "//*[@id='priceblock_saleprice']",
  ]);
  const old = priceFromXpaths(document, [
    "//*[@id='corePrice_feature_div']//*[@data-a-strike='true']//*[contains(@class,'a-offscreen')][1]",
    "//*[@id='basisPrice']//*[contains(@class,'a-offscreen')][1]",
    "//*[contains(@class,'a-text-price')]//*[contains(@class,'a-offscreen')][1]",
    "//*[contains(@class,'priceBlockStrikePriceString')][1]",
  ]);

  if (!current) {
    current = regexPrice(htmlText, [
      /"priceAmount"\s*:\s*"?([\d,.]+)"?/i,
      /"lowPrice"\s*:\s*"?([\d,.]+)"?/i,
      /"price"\s*:\s*"?([\d,.]+)"?/i,
    ]);
  }

  let variantCurrency: string | null = null;
  if (!current) {
    const selectedVariant = amazonSelectedVariantPrice(document);
    if (selectedVariant) {
      current = selectedVariant.price;
      variantCurrency = selectedVariant.currency;
    }
  }

  let title = textFrom(document, [
    "//*[@id='productTitle']",
    "//h1[contains(@class,'product-title-word-break')]",
    "//h1[@id='title']",
    "//meta[@property='og:title']",
    "//title",
  ]);
  if (title) {
    title = title.replace(/^Amazon\.[^:]+:\s*/i, "");
    title = title.replace(
      /\s*:\s*(?:Electronics|Computers & Accessories|Amazon\.[^ ]+)[\s\S]*$/i,
      "",
    );
    title = title
      .split(
        /\s*(?:About this item|Technical Details|Additional Information|Warranty & Support|From the manufacturer|Product Description)/,
      )[0]
      .trim();
    if (/^Amazon\.[a-z.]+$/i.test(title)) title = null;
  }

  const rawImage =
    attributeFrom(
      document,
      ["//*[@id='landingImage']", "//*[@id='imgBlkFront']", "//*[@id='ebooksImgBlkFront']"],
      ["data-old-hires", "src"],
    ) ??
    attributeFrom(document, ["//meta[@property='og:image']"], ["content"]) ??
    amazonMobileImage(document, htmlText);
  let image = normalizeImageUrl(rawImage, pageUrl);
  if (image) image = image.replace(/\._[A-Z]{2}[^.]*_\./g, "._AC_SL1500_.");

  const description = textFrom(document, [
    "//*[@id='feature-bullets']//ul",
    "//*[@id='productDescription']//p[1]",
  ]);
  const priceRegionText = textFrom(document, [
    "//*[@id='corePrice_feature_div']",
    "//*[@id='corePriceDisplay_desktop_feature_div']",
  ]);
  const currency =
    variantCurrency ?? currencyFromText(priceRegionText ?? htmlText.slice(0, 100_000));

  return buildResult("amazon", title, description, image, old, current, currency);
};

/**
 * Amazon's mobile layout ships neither `og:image` nor `#landingImage`; the
 * gallery image lives in a `data-a-dynamic-image` URL→size map, or in the
 * `hiRes`/`large` keys of the inline image-block state.
 */
function amazonMobileImage(document: Document, htmlText: string): string | null {
  const dynamic = attributeFrom(
    document,
    [
      "//*[@id='imgTagWrapperId']//img[1]",
      "//*[@id='main-image-container']//img[1]",
      "//*[@id='imageBlock']//img[1]",
      "//img[@data-a-dynamic-image][1]",
    ],
    ["data-a-dynamic-image", "data-old-hires", "src"],
  );
  if (dynamic) {
    if (dynamic.startsWith("{")) {
      const firstKey = /"(https?:[^"]+)"\s*:/.exec(dynamic);
      if (firstKey) return firstKey[1];
    } else if (!dynamic.startsWith("data:")) {
      return dynamic;
    }
  }

  const inline = /"(?:hiRes|large|mainUrl)"\s*:\s*"(https?:[^"]+\.(?:jpg|jpeg|png|webp))"/i.exec(
    htmlText,
  );
  return inline ? inline[1].split("\\/").join("/") : null;
}

function amazonSelectedVariantPrice(
  document: Document,
): { price: string; currency: string | null } | null {
  const selected = xpathAllElements(
    document,
    "//li[@data-initiallyselected='true' or .//input[@role='radio' and @aria-checked='true']]" +
      "//*[contains(concat(' ', normalize-space(@class), ' '), ' inline-twister-swatch-price ')]",
  );
  for (const node of selected) {
    const text = cleanText(node.textContent);
    if (!text) continue;
    const match = /(?:\bfrom\b|[$€£])\s*(?:US\s*)?([$€£])?\s*([\d][\d,.]*)/i.exec(text);
    if (!match) continue;
    const price = normalizePrice(match[2]);
    if (price) return { price, currency: currencyFromText(text) };
  }
  return null;
}

// --------------------------------------------------------------------------
// AliExpress
// --------------------------------------------------------------------------

export const extractAliexpress: ComplexExtractor = (document, htmlText, pageUrl) => {
  const scriptData = aliexpressScriptData(htmlText);

  let title =
    textFrom(document, [
      "//*[contains(@class,'title--')]//*[contains(@class,'rc-title-content')][1]",
      "//*[contains(@class,'components--title')][1]",
      "//h1[@data-pl='product-title']",
      "//h1[contains(@class,'product-title-text')]",
      "//h1[1]",
      "//meta[@property='og:title']",
    ]) ?? cleanText(scriptData.title);
  if (title) {
    title = title.replace(/\s*[-–|]\s*AliExpress[\s\S]*$/gi, "").trim();
    if (title.toLowerCase() === "aliexpress" || title.toLowerCase() === "aliexpress.com") {
      title = null;
    }
  }

  const image = normalizeImageUrl(
    cleanText(scriptData.image) ??
      attributeFrom(document, ["//meta[@property='og:image']"], ["content"]) ??
      attributeFrom(
        document,
        [
          "//*[contains(@class,'image-view-magnifier-wrap')]//img[1]",
          "//img[contains(@class,'magnifier-image')][1]",
        ],
        ["src", "data-src"],
      ),
    pageUrl,
  );

  let description =
    attributeFrom(
      document,
      ["//meta[@property='og:description']", "//meta[@name='description']"],
      ["content"],
    ) ?? cleanText(scriptData.description);
  if (description && /^Smarter Shopping/i.test(description)) description = null;

  let current =
    priceFromXpaths(document, [
      "//*[contains(@class,'price-default--current')][1]",
      "//*[contains(@class,'price--current')][1]",
      "//*[contains(@class,'snow-price')]//*[contains(@class,'current')][1]",
      "//*[contains(@class,'product-price-current')][1]",
      "//meta[@property='product:price:amount']",
    ]) ?? normalizePrice(scriptData.current_price);
  let old =
    priceFromXpaths(document, [
      "//*[contains(@class,'price-default--original')][1]",
      "//*[contains(@class,'price--original')][1]",
      "//*[contains(@class,'price--del')][1]",
      "//*[contains(@class,'product-price-original')][1]",
    ]) ?? normalizePrice(scriptData.old_price);

  let trackedCurrency: string | null = null;
  if (!current) {
    const tracked = aliexpressTrackingPrices(pageUrl);
    if (tracked) {
      old = tracked.old;
      current = tracked.current;
      trackedCurrency = tracked.currency;
    }
  }

  const currency =
    trackedCurrency ??
    normalizeCurrency(
      attributeFrom(document, ["//meta[@property='product:price:currency']"], ["content"]),
    ) ??
    currencyFromText(htmlText.slice(0, 100_000));

  return buildResult("aliexpress", title, description, image, old, current, currency);
};

const ALIEXPRESS_KEY_PATTERNS: Record<string, RegExp[]> = {
  title: [/"subject"\s*:\s*"([^"]{3,300})"/i, /"productTitle"\s*:\s*"([^"]{3,300})"/i],
  image: [
    /"imageUrl"\s*:\s*"(https?:\\\/\\\/[^"]+)"/i,
    /"imagePathList"\s*:\s*\[\s*"(https?:\\\/\\\/[^"]+)"/i,
  ],
  description: [/"description"\s*:\s*"([^"]{3,1000})"/i],
  current_price: [
    /"minActivityAmount"\s*:\s*"?([\d,.]+)"?/i,
    /"activityAmount"\s*:\s*"?([\d,.]+)"?/i,
    /"formattedActivityPrice"\s*:\s*"[^"\d]*([\d,.]+)/i,
    /"salePrice"\s*:\s*"?([\d,.]+)"?/i,
    /"minAmount"\s*:\s*"?([\d,.]+)"?/i,
  ],
  old_price: [
    /"maxAmount"\s*:\s*"?([\d,.]+)"?/i,
    /"originalPrice"\s*:\s*"?([\d,.]+)"?/i,
    /"listPrice"\s*:\s*"?([\d,.]+)"?/i,
  ],
};

function aliexpressScriptData(htmlText: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, patterns] of Object.entries(ALIEXPRESS_KEY_PATTERNS)) {
    for (const pattern of patterns) {
      const match = pattern.exec(htmlText);
      if (!match) continue;
      let value = match[1].split("\\/").join("/");
      try {
        value = JSON.parse(`"${value}"`) as string;
      } catch {
        // Keep the raw capture, exactly like the Python fallback.
      }
      result[key] = value;
      break;
    }
  }
  return result;
}

function aliexpressTrackingPrices(
  pageUrl: string,
): { old: string; current: string; currency: string } | null {
  let query: URLSearchParams;
  try {
    query = new URL(pageUrl).searchParams;
  } catch {
    return null;
  }
  // Python unquotes a second time on top of `parse_qs`; mirrored here.
  const npi = decodeOnce(query.get("pdp_npi") ?? "");
  const skuPayload = decodeOnce(query.get("pdp_ext_f") ?? "");
  const skuMatch = /"sku_id"\s*:\s*"(\d+)"/.exec(skuPayload);
  const skuId = query.get("sku_id") ?? (skuMatch ? skuMatch[1] : null);
  if (!npi || !skuId || !npi.includes(skuId)) return null;

  const priceMatch = /!{3,}(\d+(?:\.\d+)?)!(\d+(?:\.\d+)?)!/.exec(npi);
  if (!priceMatch) return null;
  return { old: priceMatch[1], current: priceMatch[2], currency: "USD" };
}

function decodeOnce(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// --------------------------------------------------------------------------
// ASOS
// --------------------------------------------------------------------------

export const extractAsos: ComplexExtractor = (document, htmlText, pageUrl) => {
  const title = textFrom(document, ["//meta[@property='og:title']", "//h1[1]", "//title"]);
  const description = textFrom(document, [
    "//meta[@property='og:description']",
    "//meta[@name='description']",
  ]);
  const image = normalizeImageUrl(
    attributeFrom(document, ["//meta[@property='og:image']"], ["content"]),
    pageUrl,
  );

  const productIdMatch = /\/prd\/(\d+)/i.exec(pageUrl);
  const responseMatch =
    /window\.asos\.pdp\.config\.stockPriceResponse\s*=\s*'(\[[\s\S]*?\])'\s*;/.exec(htmlText);

  let oldPrice: string | null = null;
  let currentPrice: string | null = null;
  let currency: string | null = null;

  if (productIdMatch && responseMatch) {
    let prices: unknown[] = [];
    try {
      const parsed: unknown = JSON.parse(responseMatch[1]);
      prices = Array.isArray(parsed) ? parsed : [];
    } catch {
      prices = [];
    }
    const productId = Number.parseInt(productIdMatch[1], 10);
    const priceEntry = prices.find((entry) => isRecord(entry) && entry.productId === productId);
    const productPrice = isRecord(priceEntry) ? priceEntry.productPrice : null;
    if (isRecord(productPrice)) {
      const current = productPrice.current;
      const previous = productPrice.previous;
      currentPrice = normalizePrice(isRecord(current) ? current.value : null);
      oldPrice = normalizePrice(isRecord(previous) ? previous.value : null);
      currency = normalizeCurrency(productPrice.currency);
    }
  }

  return buildResult("asos", title, description, image, oldPrice, currentPrice, currency);
};

// --------------------------------------------------------------------------
// Target
// --------------------------------------------------------------------------

export const extractTarget: ComplexExtractor = (document, htmlText, pageUrl) => {
  const selected = /(?:[?&])preselect=(\d+)/.exec(pageUrl);
  const selectedTcin = selected ? selected[1] : null;

  const title = attributeFrom(document, ["//meta[@property='og:title']"], ["content"]);
  const description = attributeFrom(
    document,
    ["//meta[@property='og:description']", "//meta[@name='description']"],
    ["content"],
  );
  const image = normalizeImageUrl(
    attributeFrom(document, ["//meta[@property='og:image']"], ["content"]),
    pageUrl,
  );

  let scopedText = "";
  if (selectedTcin) {
    const windows: string[] = [];
    const finder = new RegExp(escapeRegExp(selectedTcin), "g");
    let match = finder.exec(htmlText);
    while (match) {
      windows.push(htmlText.slice(Math.max(0, match.index - 8_000), match.index + 8_000));
      match = finder.exec(htmlText);
    }
    scopedText = windows.join("\n");
  }

  const current =
    priceFromXpaths(document, [
      "//*[@data-test='product-price'][1]",
      "//*[@data-test='product-price-primary'][1]",
      "//*[@itemprop='price'][1]",
    ]) ??
    regexPrice(scopedText, [
      /"current_retail(?:_min)?"\s*:\s*([\d.]+)/i,
      /"formatted_current_price"\s*:\s*"\$?([\d,.]+)/i,
    ]);
  const regular =
    priceFromXpaths(document, [
      "//*[@data-test='product-regular-price'][1]",
      "//*[contains(@class,'strikethrough')][1]",
    ]) ??
    regexPrice(scopedText, [
      /"reg_retail(?:_max)?"\s*:\s*([\d.]+)/i,
      /"formatted_comparison_price"\s*:\s*"\$?([\d,.]+)/i,
    ]);

  const result = buildResult(
    "target",
    title,
    description,
    image,
    regular,
    current,
    current ? "USD" : null,
  );
  if (!result.product.price) {
    result.warnings.push(
      "do_not_merge:price",
      "do_not_merge:discount_price",
      "do_not_merge:currency",
    );
  }
  return result;
};

// --------------------------------------------------------------------------
// Flipkart
// --------------------------------------------------------------------------

export const extractFlipkart: ComplexExtractor = (document, _htmlText, pageUrl) => {
  let title = attributeFrom(document, ["//meta[@property='og:title']"], ["content"]);
  if (title) title = title.replace(/\s*-\s*Buy\s[\s\S]*$/gi, "").trim();

  const description = attributeFrom(
    document,
    [
      "//meta[@property='og:description']",
      "//meta[@name='description']",
      "//meta[@name='Description']",
    ],
    ["content"],
  );
  let image = normalizeImageUrl(
    attributeFrom(document, ["//meta[@property='og:image']"], ["content"]),
    pageUrl,
  );
  if (image) image = image.replace(/\/image\/\d+\/\d+\//g, "/image/1500/1500/");

  const price = regexPrice(description ?? "", [
    /\bat\s+Rs\.\s*([\d,]+(?:\.\d+)?)\s+at\s+Flipkart\.com/i,
  ]);

  const result = buildResult(
    "flipkart",
    title,
    description,
    image,
    null,
    price,
    price ? "INR" : null,
  );
  if (!result.product.price) {
    result.warnings.push("do_not_merge:price", "do_not_merge:currency");
  }
  return result;
};

// --------------------------------------------------------------------------
// Trendyol
// --------------------------------------------------------------------------

const TRENDYOL_LOCALE_CURRENCIES: Record<string, string> = {
  uk: "UAH",
  ro: "RON",
  el: "EUR",
  de: "EUR",
  en: "AED",
};

export const extractTrendyol: ComplexExtractor = (document, htmlText, pageUrl) => {
  let title = attributeFrom(document, ["//meta[@property='og:title']"], ["content"]);
  if (title) title = title.replace(/\s*[–—-]\s*(?:[\s\S]*?\s+)?Trendyol[\s\S]*$/gi, "").trim();

  const description = attributeFrom(
    document,
    ["//meta[@property='og:description']", "//meta[@name='description']"],
    ["content"],
  );
  const image = normalizeImageUrl(
    attributeFrom(document, ["//meta[@property='og:image']"], ["content"]),
    pageUrl,
  );

  const current = regexPrice(htmlText, [
    /"product_discounted_price"\s*:\s*([\d.]+)/i,
    /"product_price"\s*:\s*([\d.]+)/i,
  ]);
  const regular = regexPrice(htmlText, [/"product_original_price"\s*:\s*([\d.]+)/i]);

  const locale = (pathnameOf(pageUrl).split("/")[1] ?? "").toLowerCase();
  let currency: string | null = TRENDYOL_LOCALE_CURRENCIES[locale] ?? null;
  if (!currency) {
    const match = /"currency"\s*:\s*"([A-Z]{3})"/.exec(htmlText);
    currency = match ? normalizeCurrency(match[1]) : "TRY";
  }

  const result = buildResult(
    "trendyol",
    title,
    description,
    image,
    regular,
    current,
    current ? currency : null,
  );
  if (!result.product.price) {
    result.warnings.push("do_not_merge:price", "do_not_merge:currency");
  }
  return result;
};

// --------------------------------------------------------------------------
// Zalando
// --------------------------------------------------------------------------

export const extractZalando: ComplexExtractor = (document, _htmlText, pageUrl) => {
  let title = attributeFrom(document, ["//meta[@property='og:title']"], ["content"]);
  if (title) title = title.replace(/\s*-\s*Zalando\.[a-z.]+\s*$/gi, "").trim();

  const description = attributeFrom(
    document,
    ["//meta[@property='og:description']", "//meta[@name='description']"],
    ["content"],
  );
  const image = normalizeImageUrl(
    attributeFrom(document, ["//meta[@property='og:image']"], ["content"]),
    pageUrl,
  );

  const price =
    priceFromXpaths(document, [
      "//*[@itemprop='price'][1]",
      "//meta[@property='product:price:amount'][1]",
    ]) ?? regexPrice(description ?? "", [/\bpre\s+([\d,.]+)\s*(?:€|EUR)/i]);

  const result = buildResult(
    "zalando",
    title,
    description,
    image,
    null,
    price,
    price ? "EUR" : null,
  );
  if (!result.product.price) {
    result.warnings.push("do_not_merge:price", "do_not_merge:currency");
  }
  return result;
};

// --------------------------------------------------------------------------
// Foxtrot
// --------------------------------------------------------------------------

export const extractFoxtrot: ComplexExtractor = (document, _htmlText, pageUrl) => {
  const current = priceFromXpaths(document, [
    "//*[@data-product-price-main]//data[1]",
    "//*[@data-product-price-main]//*[self::span or self::data][1]",
    "//*[@data-product-price-main]",
    "//*[contains(@class,'product-box__main_price')][1]",
    "//*[@data-rewish-price]",
    "//*[@itemprop='price' and not(ancestor::s) and not(ancestor::del)][1]",
  ]);
  const old = priceFromXpaths(document, [
    "//*[@data-product-price-old]//data[1]",
    "//*[@data-product-price-old]//*[self::span or self::data][1]",
    "//*[@data-product-price-old]",
    "//*[contains(@class,'product-box__main_discount')]//label[1]",
  ]);

  let validUntil = attributeFrom(document, ["//*[@itemprop='priceValidUntil']"], ["content"]);
  if (validUntil) validUntil = validUntil.split("T")[0];

  let image = normalizeImageUrl(
    attributeFrom(
      document,
      [
        "//*[@data-testid='product-image']//img[1]",
        "//*[@data-testid='main-image']//img[1]",
        "//*[contains(@class,'product-gallery')]//img[1]",
        "//*[contains(@class,'product-image')]//img[1]",
        "//img[@itemprop='image'][1]",
        "//picture//source[@srcset][1]",
      ],
      ["src", "data-src", "srcset"],
    ),
    pageUrl,
  );
  if (
    image &&
    (image.toLowerCase().includes("placeholder") || image.toLowerCase().includes("no-image"))
  ) {
    image = null;
  }

  const result = buildResult(
    "foxtrot",
    textFrom(document, ["//h1[1]", "//meta[@property='og:title']"]),
    attributeFrom(
      document,
      ["//meta[@property='og:description']", "//meta[@name='description']"],
      ["content"],
    ),
    image,
    old,
    current,
    "UAH",
  );
  result.product.discount_end_date = validUntil;
  if (validUntil) result.sources.discount_end_date = "store:foxtrot";
  return result;
};

// --------------------------------------------------------------------------
// n11
// --------------------------------------------------------------------------

export const extractN11: ComplexExtractor = (document, htmlText, pageUrl) => {
  let title = textFrom(document, [
    "//meta[@property='og:title']",
    "//h1[contains(@class,'proName')]",
    "//h1[contains(@class,'product-name')]",
    "//title",
  ]);
  if (title) title = title.replace(/\s*[-–—]\s*n11\.com[\s\S]*$/gi, "").trim();

  let rawImage = attributeFrom(document, ["//meta[@property='og:image']"], ["content"]);
  if (rawImage && (rawImage.startsWith("data:") || rawImage.includes("<svg"))) rawImage = null;
  rawImage =
    rawImage ??
    attributeFrom(
      document,
      [
        "//*[contains(@class,'imgObj')]//img[1]",
        "//*[contains(@class,'unf-p-img')]//img[1]",
        "//*[@id='mainItemImg']",
        "//*[contains(@class,'product-images')]//img[1]",
      ],
      ["data-original", "data-src", "data-lazy", "src"],
    );
  if (!rawImage) {
    const match = /https:\/\/n11scdn\.akamaized\.net\/[^\s"']+\.(?:jpg|png|webp)/i.exec(htmlText);
    rawImage = match ? match[0] : null;
  }

  const current =
    priceFromXpaths(document, [
      "//*[contains(@class,'newPrice')]//ins[1]",
      "//*[contains(@class,'newPrice')][1]",
      "//*[contains(@class,'sale-price')][1]",
      "//*[@data-price='current'][1]",
      "//*[contains(@class,'unf-p-price-s')][1]",
    ]) ??
    regexPrice(htmlText, [
      /(?:SEPETTE|indirimli|fiyat)[^<]*?([\d.,\s]+)\s*TL/i,
      /"price"\s*:\s*([\d.]+)/i,
    ]);
  const old = priceFromXpaths(document, [
    "//*[contains(@class,'oldPrice')]//del[1]",
    "//*[contains(@class,'oldPrice')][1]",
    "//*[contains(@class,'old-price')][1]",
    "//*[@data-price='old'][1]",
  ]);

  return buildResult(
    "n11",
    title,
    attributeFrom(
      document,
      ["//meta[@property='og:description']", "//meta[@name='description']"],
      ["content"],
    ),
    normalizeImageUrl(rawImage, pageUrl),
    old,
    current,
    "TRY",
  );
};

// --------------------------------------------------------------------------
// Shared helpers (`complex.py` private functions)
// --------------------------------------------------------------------------

function buildResult(
  store: string,
  title: string | null,
  description: string | null,
  image: string | null,
  oldPrice: string | null,
  currentPrice: string | null,
  currency: string | null,
): ExtractionResult {
  const discount =
    oldPrice && currentPrice
      ? normalizeDiscount(oldPrice, currentPrice)
      : { price: normalizePrice(currentPrice), discountPrice: null, hasDiscount: false };

  const product = productFrom({
    title: cleanText(title),
    description: cleanText(description),
    image,
    price: discount.price,
    discount_price: discount.discountPrice,
    has_discount: discount.hasDiscount,
    currency: normalizeCurrency(currency),
  });
  return extractionOf(product, `store:${store}`);
}

/** Port of `complex.py::_text` — a `content` attribute wins over text. */
function textFrom(document: Document, expressions: readonly string[]): string | null {
  for (const expression of expressions) {
    const node = xpathFirst(document, expression);
    if (node === null) continue;
    const value =
      typeof node === "string"
        ? cleanText(node)
        : cleanText(node.getAttribute("content") || node.textContent);
    if (value) return value;
  }
  return null;
}

/** Port of `complex.py::_attribute`. */
export function attributeFrom(
  document: Document,
  expressions: readonly string[],
  attributes: readonly string[],
): string | null {
  for (const expression of expressions) {
    const node = xpathFirst(document, expression);
    if (node === null || typeof node === "string") continue;
    for (const attribute of attributes) {
      const value = cleanText(node.getAttribute(attribute));
      if (value) return attribute === "srcset" ? value.split(/\s+/)[0] : value;
    }
  }
  return null;
}

/** Port of `complex.py::_price_from_xpaths`. */
function priceFromXpaths(document: Document, expressions: readonly string[]): string | null {
  for (const expression of expressions) {
    const node = xpathFirst(document, expression);
    if (node === null) continue;
    const raw =
      typeof node === "string"
        ? node
        : node.getAttribute("value") ||
          node.getAttribute("content") ||
          node.getAttribute("data-rewish-price") ||
          node.getAttribute("data-price") ||
          node.textContent;
    const price = normalizePrice(raw);
    if (price) return price;
  }
  return null;
}

/** Port of `complex.py::_regex_price`. */
function regexPrice(htmlText: string, patterns: readonly RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = new RegExp(pattern.source, pattern.flags.replace("g", "")).exec(htmlText);
    if (!match) continue;
    const price = normalizePrice(match[1]);
    if (price) return price;
  }
  return null;
}

const ISO_CURRENCIES = new Set([
  "AUD",
  "CAD",
  "CHF",
  "EUR",
  "GBP",
  "INR",
  "JPY",
  "PLN",
  "RON",
  "RUB",
  "TRY",
  "UAH",
  "USD",
]);

const SYMBOL_CURRENCY_PATTERNS: readonly [RegExp, string][] = [
  [/\bUSD\b|US\$|\$/i, "USD"],
  [/\bEUR\b|€/i, "EUR"],
  [/\bGBP\b|£/i, "GBP"],
  [/\bUAH\b|₴|грн/i, "UAH"],
  [/\bTRY\b|₺|\bTL\b/i, "TRY"],
  [/\bINR\b|₹/i, "INR"],
];

/**
 * Port of `complex.py::_currency_from_text` — note this is stricter than the
 * generic one: the ISO probe is case-sensitive and gated on a currency list.
 */
export function currencyFromText(value: string): string | null {
  const isoMatch = /(?:\b([A-Z]{3})\s*[\d]|\b[\d][\d\s,.]*\s*([A-Z]{3})\b)/.exec(value);
  if (isoMatch) {
    const currency = normalizeCurrency(isoMatch[1] || isoMatch[2]);
    if (currency && ISO_CURRENCIES.has(currency)) return currency;
  }
  for (const [pattern, currency] of SYMBOL_CURRENCY_PATTERNS) {
    if (pattern.test(value)) return currency;
  }
  return null;
}

function xpathAllElements(document: Document, expression: string): Element[] {
  const nodes: Element[] = [];
  let result: XPathResult;
  try {
    result = document.evaluate(expression, document, null, 0, null);
  } catch {
    return nodes;
  }
  if (result.resultType < 4) return nodes;
  let node = result.iterateNext();
  while (node) {
    if (node.nodeType === 1) nodes.push(node as Element);
    node = result.iterateNext();
  }
  return nodes;
}
