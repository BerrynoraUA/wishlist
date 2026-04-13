import * as cheerio from "cheerio";
import { ProductData } from "../types";
import {
  extractCurrency,
  extractNumericPrice,
  extractTitle,
  extractDescription,
} from "../utils";

export function scrapeAmazon(html: string, url: string): ProductData {
  const $ = cheerio.load(html);
  logAmazon("start", { url });

  const currentPriceText = pickFirstText($, "currentPrice", [
    "#corePrice_feature_div span.a-price.apex-pricetopay-value span.a-offscreen",
    "#corePriceDisplay_desktop_feature_div span.a-price span.a-offscreen",
    "span.priceToPay span.a-offscreen",
    "#price_inside_buybox",
    "#priceblock_dealprice",
    "#dealprice_feature_div span.a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_saleprice",
  ]);

  const oldPriceText = pickFirstText($, "oldPrice", [
    "#corePrice_feature_div span.a-price[data-a-strike='true'] span.a-offscreen",
    "#basisPrice span.a-price span.a-offscreen",
    "span.a-text-price[data-a-strike='true'] span.a-offscreen",
    "span.priceBlockStrikePriceString",
    ".a-text-price .a-offscreen",
  ]);

  let currentPrice = extractNumericPrice(currentPriceText);
  let oldPrice = extractNumericPrice(oldPriceText);

  // Fallback: try to find price in embedded JSON/JS data
  if (!currentPrice) {
    const pricePatterns = [
      /"priceAmount"\s*:\s*"?([\d,.]+)"?/,
      /"price"\s*:\s*"?([\d,.]+)"?/,
      /"lowPrice"\s*:\s*"?([\d,.]+)"?/,
    ];
    for (const pat of pricePatterns) {
      const m = html.match(pat);
      if (m) {
        currentPrice = extractNumericPrice(m[1]);
        if (currentPrice) {
          logAmazon("price.jsonFallback", {
            pattern: pat.source,
            value: currentPrice,
          });
          break;
        }
      }
    }
  }

  logAmazon("price.parsed", {
    currentPriceText,
    currentPrice,
    oldPriceText,
    oldPrice,
  });

  if (oldPrice && currentPrice) {
    const oldNum = parseFloat(oldPrice);
    const curNum = parseFloat(currentPrice);

    if (oldNum < curNum) {
      [oldPrice, currentPrice] = [currentPrice, oldPrice];
    }

    if (oldNum === curNum) {
      oldPrice = null;
    }
  }
  logAmazon("price.normalized", { currentPrice, oldPrice });

  const hasDiscount = Boolean(
    oldPrice && currentPrice && oldPrice !== currentPrice,
  );
  logAmazon("discount", { hasDiscount });

  let title = pickFirstText($, "title", [
    "#productTitle",
    "h1.product-title-word-break",
    "h1#title",
  ]);

  if (!title) {
    // OG/meta title fallback — clean Amazon suffix
    const ogTitle =
      $('meta[property="og:title"]').attr("content")?.trim() || "";
    const metaTitle = $("title").text().trim() || "";
    const raw = ogTitle || metaTitle;
    title = raw
      .replace(
        /\s*:\s*(?:Electronics|Computers & Accessories|Amazon\.com).*$/i,
        "",
      )
      .replace(/^Amazon\.com:\s*/i, "")
      .trim();
    logAmazon("title.metaFallback", { ogTitle, metaTitle, cleaned: title });
  }

  if (!title) {
    title = extractTitle($) || "";
    logAmazon("title.fallback", { value: title });
  }

  if (title) {
    title = title
      .replace(
        /\s*(About this item|Technical Details|Additional Information|Warranty & Support|Feedback|From the manufacturer|Product information|Product Description|Customer reviews)[\s\S]*/,
        "",
      )
      .trim();
  }
  logAmazon("title.final", { title });

  const image = pickAmazonImage(html, $);
  logAmazon("image.final", { image });

  let description = pickFirstText($, "description", [
    "#feature-bullets ul",
    "#productDescription p",
  ])
    .replace(/\s+/g, " ")
    .trim();

  if (!description) {
    description = extractDescription($) || "";
    logAmazon("description.fallback", { value: description });
  }
  logAmazon("description.final", {
    length: description.length,
    preview: description.slice(0, 200),
  });

  const currency = extractCurrency($, html, url);
  logAmazon("currency", { currency });

  const result = {
    title: title || null,
    description: description || null,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency,
  } satisfies ProductData;

  logAmazon("result", result);
  return result;
}

function pickFirstText(
  $: cheerio.CheerioAPI,
  label: string,
  selectors: string[],
): string {
  for (const selector of selectors) {
    const value = $(selector).first().text().trim();
    logAmazon(`${label}.check`, { selector, value });

    if (value) {
      logAmazon(`${label}.match`, { selector, value });
      return value;
    }
  }

  logAmazon(`${label}.miss`, { selectors });
  return "";
}

function pickAmazonImage(html: string, $: cheerio.CheerioAPI): string {
  const imageDom = cheerio.load(html);
  const image = imageDom("#landingImage").first();
  const paperbackImage = imageDom("#imgBlkFront").first();
  const ebookImage = imageDom("#ebooksImgBlkFront").first();
  const element = image.length
    ? image
    : paperbackImage.length
      ? paperbackImage
      : ebookImage;

  logAmazon("image.node", {
    landingImageFound: image.length > 0,
    imgBlkFrontFound: paperbackImage.length > 0,
    ebooksImgBlkFrontFound: ebookImage.length > 0,
    matchedId: element.attr("id") || null,
  });

  if (element.length) {
    const rawHighRes = element.attr("data-old-hires") || "";
    const rawSrc = element.attr("src") || "";
    const rawValue = rawHighRes || rawSrc;

    logAmazon("image.attrs", {
      dataOldHires: rawHighRes,
      src: rawSrc,
      selectedAttr: rawHighRes ? "data-old-hires" : "src",
    });

    const decodedSrc = decodeHtmlEntities(rawValue.trim());
    if (decodedSrc) {
      logAmazon("image.match", {
        selector: `#${element.attr("id") || "unknown"}`,
        attr: rawHighRes ? "data-old-hires" : "src",
        value: decodedSrc,
      });
      return upgradeAmazonImageQuality(decodedSrc);
    }
  }

  // Fallback: OG image or first large product image
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() || "";
  if (ogImage) {
    logAmazon("image.ogFallback", { ogImage });
    return upgradeAmazonImageQuality(ogImage);
  }

  return "";
}

function decodeHtmlEntities(value: string): string {
  if (!value) {
    return "";
  }

  return cheerio.load(`<span>${value}</span>`)("span").text().trim();
}

/**
 * Upgrade Amazon image URL to a higher resolution.
 * Amazon image URLs contain size tokens like ._AC_SR100,100_ or ._SY355_
 * Replace them to get a larger image.
 */
function upgradeAmazonImageQuality(url: string): string {
  if (!url) return url;
  // Replace size/quality tokens: _AC_SR100,100_QL65_ → _AC_SL1500_
  return url.replace(/\._[A-Z]{2}[^.]*_\./g, "._AC_SL1500_.");
}

function logAmazon(step: string, payload: unknown): void {
  console.info(`[amazon] ${step}`, payload);
}
