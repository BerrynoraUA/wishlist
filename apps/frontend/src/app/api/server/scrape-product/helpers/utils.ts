import * as cheerio from "cheerio";

// === PRICE EXTRACTION ===

/**
 * Витягує числову ціну з тексту (підтримка US, European, та пробільних форматів)
 */
export function extractNumericPrice(text: string): string | null {
  if (!text) return null;

  // Видаляємо символи валют та інші нечислові (зберігаємо цифри, крапки, коми, пробіли)
  let cleaned = text.replace(/[^\d\s,.\-]/g, "").trim();
  if (!cleaned || !/\d/.test(cleaned)) return null;

  // Видаляємо початкові/кінцеві роздільники
  cleaned = cleaned.replace(/^[\s,.\-]+|[\s,.\-]+$/g, "");
  if (!cleaned) return null;

  // Визначаємо формат числа та нормалізуємо
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Європейський: 1.234,56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US/UK: 1,234.56
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length === 3) {
      // Роздільник тисяч: 1,234
      cleaned = cleaned.replace(",", "");
    } else if (parts.length > 2) {
      // Декілька ком — роздільники тисяч: 1,234,567
      cleaned = cleaned.replace(/,/g, "");
    } else {
      // Десятковий роздільник: 12,50 або 12,5
      cleaned = cleaned.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      // Декілька крапок — роздільники тисяч: 1.234.567
      cleaned = cleaned.replace(/\./g, "");
    }
    // Одна крапка — десятковий роздільник, залишаємо
  }

  // Видаляємо пробіли (роздільники тисяч: 1 234 → 1234)
  cleaned = cleaned.replace(/\s/g, "");

  const numPrice = parseFloat(cleaned);
  // Перевірка: реальна ціна (не рік, не ID тощо)
  if (isNaN(numPrice) || numPrice <= 0 || numPrice >= 10000000) return null;

  return cleaned;
}

/**
 * Витягує ціну з JSON структур в HTML
 */
export function extractPriceFromJSON(html: string): string | null {
  const jsonPatterns = [
    /"price[":]*\s*(\d+\.?\d*)/i,
    /"amount[":]*\s*(\d+\.?\d*)/i,
    /"current[^"]*price[":]*\s*(\d+\.?\d*)/i,
    /price['":\s]*(\d+\.?\d*)/i,
  ];

  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const price = extractNumericPrice(match[1]);
      if (price) return price;
    }
  }

  return null;
}

/**
 * Витягує ціну за допомогою regex паттернів
 */
export function extractPriceRegex(html: string): string | null {
  const patterns = [
    /content=["'](\d+\.?\d*)\s*UAH["']/i,
    /content=["'](\d+\.?\d*)\s*USD["']/i,
    /content=["'](\d+\.?\d*)\s*EUR["']/i,
    /content=["'](\d+[,.\s]*\d*)["']/i,
    /₴\s*([\d\s,.]+)/,
    /\$\s*([\d\s,.]+)/,
    /€\s*([\d\s,.]+)/,
    /£\s*([\d\s,.]+)/,
    /"price[":]*\s*(\d+\.?\d*)/i,
    /"amount[":]*\s*(\d+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const price = extractNumericPrice(match[1]);
      if (price) return price;
    }
  }

  return null;
}

// === DATE EXTRACTION ===

/**
 * Витягує дату з тексту (для закінчення акції)
 */
export function extractDateFromText(text: string): string | null {
  if (!text) return null;

  // ISO date: 2025-01-31 або 2025-01-31T23:59:59
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2}(?:T[\d:]+)?)/);
  if (isoMatch) return isoMatch[1];

  // DD.MM.YYYY або DD/MM/YYYY
  const euMatch = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (euMatch)
    return `${euMatch[3]}-${euMatch[2].padStart(2, "0")}-${euMatch[1].padStart(2, "0")}`;

  // MM/DD/YYYY
  const usMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const month = parseInt(usMatch[1]);
    if (month <= 12)
      return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }

  // "Jan 31, 2025" or "January 31 2025"
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const namedMonth = text.match(/(\w{3,})\s+(\d{1,2}),?\s*(\d{4})/i);
  if (namedMonth) {
    const m = months[namedMonth[1].toLowerCase().slice(0, 3)];
    if (m) return `${namedMonth[3]}-${m}-${namedMonth[2].padStart(2, "0")}`;
  }

  // "31 Jan 2025"
  const namedMonth2 = text.match(/(\d{1,2})\s+(\w{3,}),?\s*(\d{4})/i);
  if (namedMonth2) {
    const m = months[namedMonth2[2].toLowerCase().slice(0, 3)];
    if (m) return `${namedMonth2[3]}-${m}-${namedMonth2[1].padStart(2, "0")}`;
  }

  return null;
}

// === DOM HELPERS ===

/**
 * Перевіряє чи елемент є discount badge (показує різницю, а не реальну ціну)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isDiscountBadge($: cheerio.CheerioAPI, el: any): boolean {
  const $el = $(el);

  if (
    $el.attr("data-discount-badge") !== undefined ||
    $el.attr("data-product-price-badge") !== undefined
  ) {
    return true;
  }

  const className = ($el.attr("class") || "").toLowerCase();
  if (
    /discount[-_]?badge|badge[-_]?discount|price[-_]?badge|savings[-_]?badge|save[-_]?badge/.test(
      className,
    )
  ) {
    return true;
  }

  const text = $el.text().trim();
  if (/^[-−–]\s*\d/.test(text)) return true;
  if (/^save\b|^savings\b|^you save\b|^економія|^знижка|^вигода/i.test(text))
    return true;

  return false;
}

/**
 * Валідація пари цін (старша > поточна, swap якщо потрібно)
 */
export function validatePricePair(
  oldPrice: string | null,
  currentPrice: string | null,
): { oldPrice: string | null; currentPrice: string | null } {
  if (!oldPrice || !currentPrice) return { oldPrice, currentPrice };

  const oldNum = parseFloat(oldPrice.replace(/[^\d.]/g, ""));
  const curNum = parseFloat(currentPrice.replace(/[^\d.]/g, ""));

  if (isNaN(oldNum) || isNaN(curNum)) return { oldPrice, currentPrice };

  if (oldNum < curNum) {
    return { oldPrice: currentPrice, currentPrice: oldPrice };
  }
  if (oldNum === curNum) {
    return { oldPrice: null, currentPrice };
  }

  return { oldPrice, currentPrice };
}

// === CONTENT EXTRACTORS ===

export function extractTitle($: cheerio.CheerioAPI): string | null {
  const selectors = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'h1[itemprop="name"]',
    'h1[class*="title"]',
    'h1[class*="product"]',
    "h1",
    "title",
  ];

  for (const selector of selectors) {
    const value = $(selector).attr("content") || $(selector).text().trim();
    if (value && value.length > 0) return value;
  }

  return null;
}

export function extractDescription($: cheerio.CheerioAPI): string | null {
  const selectors = [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
    'div[itemprop="description"]',
    '[class*="description"]',
  ];

  for (const selector of selectors) {
    const value = $(selector).attr("content") || $(selector).text().trim();
    if (value && value.length > 0) return value;
  }

  return null;
}

export function extractImage(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): string | null {
  const selectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'img[itemprop="image"]',
    '[class*="product"] img',
    '[class*="gallery"] img',
    "img[data-main]",
  ];

  for (const selector of selectors) {
    let value = $(selector).attr("content") || $(selector).attr("src");
    if (value) {
      if (value.startsWith("//")) {
        value = "https:" + value;
      } else if (value.startsWith("/")) {
        const urlObj = new URL(baseUrl);
        value = urlObj.origin + value;
      }
      return value;
    }
  }

  return null;
}

export function extractMetaTagRegex(
  html: string,
  property: string,
): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

export function extractTagRegex(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

// === ADVANCED PRICE EXTRACTION ===

/**
 * Знаходить пару "стара ціна / нова ціна" з DOM-структури
 */
export function extractPricePairFromDOM($: cheerio.CheerioAPI): {
  oldPrice: string | null;
  currentPrice: string | null;
} {
  let oldPrice: string | null = null;
  let currentPrice: string | null = null;

  const strikethroughSelector =
    'del, s, [style*="line-through"], [class*="line-through"], [class*="strikethrough"], ' +
    '[class*="STRIKETHROUGH"], [class*="linethrough"], [class*="crossed-out"], ' +
    '[class*="text-decoration-line-through"]';

  // --- Стратегія 1: WooCommerce / CMS pattern ---
  const priceContainers = $(
    'p.price, .price, .product-price, [class*="price-box"], [class*="priceBox"], ' +
      '[class*="price-wrapper"], [class*="priceWrapper"], [class*="price-container"], ' +
      '[class*="priceContainer"], [class*="price-block"], [class*="priceBlock"], ' +
      '[class*="bin-price"], [class*="price-info"], [class*="priceInfo"]',
  );

  priceContainers.each((_, container) => {
    if (oldPrice && currentPrice) return;
    const delEl = $(container).find("del, s").first();
    const insEl = $(container).find("ins").first();

    if (delEl.length && insEl.length) {
      const op = extractNumericPrice(delEl.text().trim());
      const np = extractNumericPrice(insEl.text().trim());
      if (op && np && op !== np) {
        oldPrice = op;
        currentPrice = np;
        return;
      }
    }

    const strikeEl = $(container)
      .find(
        '[class*="STRIKETHROUGH"], [class*="strikethrough"], [class*="line-through"], ' +
          '[style*="line-through"], del, s',
      )
      .first();

    if (strikeEl.length) {
      const op = extractNumericPrice(strikeEl.text().trim());
      if (!op) return;

      $(container)
        .find('[class*="price"], [class*="amount"], span')
        .each((_, priceEl) => {
          if (currentPrice) return;
          const $priceEl = $(priceEl);
          if ($priceEl.is(strikeEl) || $priceEl.find(strikeEl).length > 0)
            return;
          if (
            $priceEl.closest(
              'del, s, [class*="STRIKETHROUGH"], [class*="strikethrough"], [style*="line-through"]',
            ).length > 0
          )
            return;
          if (isDiscountBadge($, priceEl)) return;
          const priceText = $priceEl.text().trim();
          if (!priceText || !/\d/.test(priceText)) return;
          const np = extractNumericPrice(priceText);
          if (np && np !== op) {
            oldPrice = op;
            currentPrice = np;
          }
        });
    }
  });

  if (oldPrice && currentPrice)
    return validatePricePair(oldPrice, currentPrice);

  // --- Стратегія 2: <del>/<s> з ціною і нова ціна поруч ---
  $(strikethroughSelector).each((_, el) => {
    if (oldPrice && currentPrice) return;

    const text = $(el).text().trim();
    if (!/\d/.test(text)) return;

    const extractedOld = extractNumericPrice(text);
    if (!extractedOld) return;

    // A) <ins> sibling
    const insEl = $(el).siblings("ins").first();
    if (insEl.length) {
      const np = extractNumericPrice(insEl.text().trim());
      if (np && np !== extractedOld) {
        oldPrice = extractedOld;
        currentPrice = np;
        return;
      }
    }

    // B) інші сиблінги
    $(el)
      .siblings()
      .each((_, sib) => {
        if (currentPrice) return;
        if ($(sib).is("del, s") || $(sib).find("del, s").length > 0) return;
        const sibStyle = $(sib).attr("style") || "";
        if (sibStyle.includes("line-through")) return;
        if (isDiscountBadge($, sib)) return;

        const sibText = $(sib).text().trim();
        if (sibText && /\d/.test(sibText)) {
          const np = extractNumericPrice(sibText);
          if (np && np !== extractedOld) {
            oldPrice = extractedOld;
            currentPrice = np;
          }
        }
      });

    if (currentPrice) return;

    // C) текст батьківського елемента без del/s
    const parent = $(el).parent();
    const parentClone = parent.clone();
    parentClone.find(strikethroughSelector).remove();
    parentClone
      .find(
        '[data-discount-badge], [class*="discount-badge"], [class*="discount_badge"]',
      )
      .remove();
    const remainingText = parentClone.text().trim();
    if (remainingText && /\d/.test(remainingText)) {
      const cleanedRemaining = remainingText.replace(/^[-−–]\s*/, "");
      const np = extractNumericPrice(cleanedRemaining);
      if (np && np !== extractedOld) {
        oldPrice = extractedOld;
        currentPrice = np;
        return;
      }
    }

    // D) grandparent
    const grandparent = parent.parent();
    if (grandparent.length) {
      const gpClone = grandparent.clone();
      gpClone.find(strikethroughSelector).remove();
      gpClone
        .find(
          '[data-discount-badge], [class*="discount-badge"], [class*="discount_badge"]',
        )
        .remove();

      gpClone.children().each((_, child) => {
        if (currentPrice) return;
        if (isDiscountBadge($, child)) return;
        const childText = $(child).text().trim();
        if (childText && /\d/.test(childText)) {
          const np = extractNumericPrice(childText);
          if (np && np !== extractedOld) {
            oldPrice = extractedOld;
            currentPrice = np;
          }
        }
      });

      if (!currentPrice) {
        const gpText = gpClone.text().trim();
        if (gpText && /\d/.test(gpText)) {
          const np = extractNumericPrice(gpText);
          if (np && np !== extractedOld) {
            oldPrice = extractedOld;
            currentPrice = np;
          }
        }
      }
    }
  });

  if (oldPrice && currentPrice)
    return validatePricePair(oldPrice, currentPrice);

  // --- Стратегія 3: відомі пари CSS класів ---
  const classPairs = [
    { old: '[class*="original-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="original-price"]', sale: '[class*="special-price"]' },
    { old: '[class*="original-price"]', sale: '[class*="discount-price"]' },
    { old: '[class*="regular-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="regular-price"]', sale: '[class*="special-price"]' },
    { old: '[class*="regular-price"]', sale: '[class*="final-price"]' },
    { old: '[class*="old-price"]', sale: '[class*="new-price"]' },
    { old: '[class*="old-price"]', sale: '[class*="current-price"]' },
    { old: '[class*="old-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="old-price"]', sale: '[class*="special-price"]' },
    { old: '[class*="was-price"]', sale: '[class*="now-price"]' },
    { old: '[class*="was-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="list-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="list-price"]', sale: '[class*="our-price"]' },
    { old: '[class*="price-was"]', sale: '[class*="price-now"]' },
    { old: '[class*="price-old"]', sale: '[class*="price-new"]' },
    { old: '[class*="price-old"]', sale: '[class*="price-current"]' },
    { old: '[class*="compare-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="price-before"]', sale: '[class*="price-after"]' },
    { old: '[class*="retail-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="full-price"]', sale: '[class*="sale-price"]' },
    { old: '[class*="price-strikethrough"]', sale: '[class*="price-current"]' },
  ];

  for (const pair of classPairs) {
    const oldEl = $(pair.old).first();
    const saleEl = $(pair.sale).first();
    if (oldEl.length && saleEl.length) {
      const op = extractNumericPrice(oldEl.text().trim());
      const np = extractNumericPrice(saleEl.text().trim());
      if (op && np && op !== np) {
        oldPrice = op;
        currentPrice = np;
        break;
      }
    }
  }

  return validatePricePair(oldPrice, currentPrice);
}

/**
 * Комплексне витягування цін з DOM, meta-тегів та JSON
 */
export function extractPricesAdvanced(
  $: cheerio.CheerioAPI,
  html: string,
): {
  currentPrice: string | null;
  oldPrice: string | null;
  discountEndDate: string | null;
} {
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;
  let discountEndDate: string | null = null;

  // 1. Meta теги
  const metaSelectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[name="price"]',
    'meta[property="product:price"]',
  ];

  for (const selector of metaSelectors) {
    const value = $(selector).attr("content");
    if (value) {
      const price = extractNumericPrice(value);
      if (price && !currentPrice) currentPrice = price;
    }
  }

  // Sale price from meta
  const saleMeta = $('meta[property="product:sale_price:amount"]').attr(
    "content",
  );
  if (saleMeta) {
    const salePrice = extractNumericPrice(saleMeta);
    if (salePrice && currentPrice && salePrice !== currentPrice) {
      oldPrice = currentPrice;
      currentPrice = salePrice;
    }
  }

  // Original price from meta
  if (!oldPrice) {
    const originalMetaVal = $(
      'meta[property="product:original_price:amount"]',
    ).attr("content");
    if (originalMetaVal) {
      const origPrice = extractNumericPrice(originalMetaVal);
      if (origPrice && currentPrice && origPrice !== currentPrice) {
        oldPrice = origPrice;
      }
    }
  }

  // 2. Schema.org microdata
  const itemPropPrice =
    $('[itemprop="price"]').attr("content") ||
    $('[itemprop="price"]').text().trim();
  if (itemPropPrice && !currentPrice) {
    const price = extractNumericPrice(itemPropPrice);
    if (price) currentPrice = price;
  }

  // 3. Paired DOM extraction
  if (!oldPrice || !currentPrice) {
    const pairResult = extractPricePairFromDOM($);
    if (pairResult.oldPrice && pairResult.currentPrice) {
      if (!oldPrice) oldPrice = pairResult.oldPrice;
      if (!currentPrice || currentPrice === oldPrice) {
        currentPrice = pairResult.currentPrice;
      }
    }
  }

  // 4. Old/original price selectors
  const oldPriceSelectors = [
    '[class*="old-price"]',
    '[class*="oldprice"]',
    '[class*="oldPrice"]',
    '[class*="price-old"]',
    '[class*="priceOld"]',
    '[class*="price--old"]',
    '[class*="was-price"]',
    '[class*="wasPrice"]',
    '[class*="price-was"]',
    '[class*="priceWas"]',
    '[class*="original-price"]',
    '[class*="originalPrice"]',
    '[class*="originalprice"]',
    '[class*="list-price"]',
    '[class*="listPrice"]',
    '[class*="listprice"]',
    '[class*="price-compare"]',
    '[class*="comparePrice"]',
    '[class*="compare-price"]',
    '[class*="price-regular"]',
    '[class*="regular-price"]',
    '[class*="regularPrice"]',
    '[class*="retail-price"]',
    '[class*="retailPrice"]',
    '[class*="price-rrp"]',
    '[class*="rrp"]',
    '[class*="price-before"]',
    '[class*="before-price"]',
    '[class*="price-strikethrough"]',
    '[class*="strikethrough"]',
    '[class*="price-crossed"]',
    '[class*="crossed-price"]',
    '[class*="full-price"]',
    '[class*="fullPrice"]',
    '[class*="price-undiscounted"]',
    '[class*="price-base"]',
    '[class*="basePrice"]',
    '[class*="price-normal"]',
    '[class*="normalPrice"]',
    '[class*="price-previous"]',
    '[class*="previousPrice"]',
    '[data-price-type="oldPrice"]',
    '[data-price-type="regularPrice"]',
    '[class*="STRIKETHROUGH"]',
    "del",
    "s",
  ];

  if (!oldPrice) {
    for (const selector of oldPriceSelectors) {
      const elements = $(selector);
      elements.each((_, el) => {
        if (oldPrice) return;
        const text = $(el).text().trim();
        if (!text || !/\d/.test(text)) return;
        const price = extractNumericPrice(text);
        if (price && parseFloat(price.replace(/[^\d.]/g, "")) > 0) {
          oldPrice = price;
        }
      });
      if (oldPrice) break;
    }
  }

  // 5. Sale / current price selectors
  if (!currentPrice) {
    const salePriceSelectors = [
      '[class*="sale-price"]',
      '[class*="salePrice"]',
      '[class*="price-sale"]',
      '[class*="special-price"]',
      '[class*="specialPrice"]',
      '[class*="price-special"]',
      '[class*="offer-price"]',
      '[class*="offerPrice"]',
      '[class*="deal-price"]',
      '[class*="dealPrice"]',
      '[class*="final-price"]',
      '[class*="finalPrice"]',
      '[class*="price-final"]',
      '[class*="discount-price"]',
      '[class*="discountPrice"]',
      '[class*="price-discount"]',
      '[class*="price-now"]',
      '[class*="now-price"]',
      '[class*="nowPrice"]',
      '[class*="price-current"]',
      '[class*="current-price"]',
      '[class*="currentPrice"]',
      '[class*="price__current"]',
      '[class*="price-new"]',
      '[class*="new-price"]',
      '[class*="newPrice"]',
      '[class*="price-actual"]',
      '[class*="actual-price"]',
      '[class*="price-reduced"]',
      '[class*="reduced-price"]',
      '[class*="our-price"]',
      '[class*="ourPrice"]',
      '[data-price-type="salePrice"]',
      '[data-price-type="finalPrice"]',
      '[data-testid*="price"]',
      "[data-price]",
      'ins [class*="amount"]',
      'ins [class*="price"]',
      '[id*="price"]',
      '[class*="product-price"]',
      '[class*="productPrice"]',
      ".price",
      '[class*="cost"]',
      '[class*="amount"]',
    ];

    for (const selector of salePriceSelectors) {
      const elements = $(selector);
      let foundPrice: string | null = null;

      elements.each((_, el) => {
        if (foundPrice) return;
        if (
          $(el).closest(
            'del, s, [style*="line-through"], [class*="STRIKETHROUGH"], [class*="strikethrough"]',
          ).length > 0
        )
          return;
        const style = $(el).attr("style") || "";
        if (style.includes("line-through")) return;
        if (isDiscountBadge($, el)) return;
        const className = $(el).attr("class") || "";
        if (
          /\b(old|was|original|compare|regular|retail|rrp|before|strikethrough|STRIKETHROUGH|crossed|full|undiscounted|previous|base|normal|list)[-_]?/i.test(
            className,
          ) &&
          !/\b(sale|special|offer|deal|final|discount|now|current|new|actual|reduced|our|primary)[-_]?/i.test(
            className,
          )
        ) {
          return;
        }

        const text =
          $(el).attr("content") ||
          $(el).attr("data-price") ||
          $(el).text().trim();
        if (text) {
          const price = extractNumericPrice(text);
          if (price && parseFloat(price.replace(/[^\d.]/g, "")) > 0) {
            foundPrice = price;
          }
        }
      });

      if (foundPrice) {
        currentPrice = foundPrice;
        break;
      }
    }
  }

  // 6. JSON prices fallback
  if (!currentPrice) {
    const jsonPrice = extractPriceFromJSON(html);
    if (jsonPrice) currentPrice = jsonPrice;
  }

  // 7. Discount end date
  const timerText = $(
    '[class*="countdown"], [class*="timer"], [class*="promo-end"], ' +
      '[class*="deal-end"], [class*="sale-end"], [class*="offer-end"]',
  )
    .text()
    .trim();
  if (timerText) {
    discountEndDate = extractDateFromText(timerText);
  }

  // 8. Price validation
  if (oldPrice && currentPrice) {
    const oldNum = parseFloat(oldPrice.replace(/[^\d.]/g, ""));
    const curNum = parseFloat(currentPrice.replace(/[^\d.]/g, ""));
    if (!isNaN(oldNum) && !isNaN(curNum)) {
      if (oldNum < curNum) {
        [oldPrice, currentPrice] = [currentPrice, oldPrice];
      }
      if (oldNum === curNum) {
        oldPrice = null;
      }
    }
  }

  return { currentPrice, oldPrice, discountEndDate };
}
