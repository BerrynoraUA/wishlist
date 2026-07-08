import { AsyncScraperMethod } from "../types";

/**
 * Скрапер для Wildberries.ru — російський маркетплейс.
 *
 * Особливості:
 * - HTML сторінка завжди блокується ботодетекцією
 * - Використовуємо CDN API (basket-XX.wbbasket.ru) для отримання даних
 * - Ціна недоступна через CDN (тільки через card.wb.ru API, який також блокується)
 * - Зображення будується з basket/vol/part/id шаблону
 * - Опис формується з description + options (Состав, Пол, Сезон)
 */

/** Визначити номер кошика (basket) за артикулом */
function getBasketNumber(id: number): number {
  const vol = Math.floor(id / 100000);
  if (vol <= 143) return 1;
  if (vol <= 287) return 2;
  if (vol <= 431) return 3;
  if (vol <= 719) return 4;
  if (vol <= 1007) return 5;
  if (vol <= 1061) return 6;
  if (vol <= 1115) return 7;
  if (vol <= 1169) return 8;
  if (vol <= 1313) return 9;
  if (vol <= 1601) return 10;
  if (vol <= 1655) return 11;
  if (vol <= 1919) return 12;
  if (vol <= 2045) return 13;
  if (vol <= 2189) return 14;
  if (vol <= 2405) return 15;
  if (vol <= 2621) return 16;
  if (vol <= 2837) return 17;
  if (vol <= 3053) return 18;
  if (vol <= 3269) return 19;
  if (vol <= 3485) return 20;
  if (vol <= 3701) return 21;
  if (vol <= 3917) return 22;
  if (vol <= 4133) return 23;
  return 24;
}

interface WBCardJson {
  imt_name?: string;
  description?: string;
  selling?: { brand_name?: string };
  options?: { name: string; value: string }[];
  media?: { photo_count?: number };
}

interface WBPriceProduct {
  id?: number;
  priceU?: number;
  salePriceU?: number;
  sizes?: Array<{
    price?: {
      basic?: number;
      product?: number;
      total?: number;
    };
  }>;
}

export const scrapeWildberries: AsyncScraperMethod = async (_html, url) => {
  const empty = {
    title: null,
    description: null,
    image: null,
    price: null,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: null,
  };

  // Extract article ID from URL: /catalog/412803412/detail.aspx
  const idMatch = url.match(/\/catalog\/(\d+)\//);
  if (!idMatch) return empty;

  const id = parseInt(idMatch[1], 10);
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  const basket = getBasketNumber(id);
  const basketStr = String(basket).padStart(2, "0");
  const basePath = `https://basket-${basketStr}.wbbasket.ru/vol${vol}/part${part}/${id}`;

  // Fetch card.json from CDN
  let card: WBCardJson;
  try {
    const res = await fetch(`${basePath}/info/ru/card.json`);
    if (!res.ok) return empty;
    card = await res.json();
  } catch {
    return empty;
  }

  // --- Title: name + brand ---
  const name = card.imt_name?.trim() || null;
  const brand = card.selling?.brand_name?.trim() || null;
  let title: string | null = null;
  if (name && brand) {
    title = `${name} ${brand}`;
  } else {
    title = name;
  }

  // --- Image: first photo from basePath ---
  let image: string | null = null;
  if (card.media?.photo_count && card.media.photo_count > 0) {
    image = `${basePath}/images/c246x328/1.webp`;
  }

  // --- Description: compose from options in fixed order ---
  const optionOrder = ["Состав", "Пол", "Сезон"];
  const optMap = new Map<string, string>();
  if (card.options) {
    for (const opt of card.options) {
      if (optionOrder.includes(opt.name)) {
        optMap.set(opt.name, opt.value);
      }
    }
  }
  const optParts: string[] = [];
  for (const key of optionOrder) {
    const val = optMap.get(key);
    if (val) optParts.push(`${key}: ${val}`);
  }
  const description = optParts.length > 0 ? optParts.join(". ") + "." : null;

  let regularPrice: number | null = null;
  let currentPrice: number | null = null;
  try {
    const priceUrl =
      "https://card.wb.ru/cards/v2/detail" +
      `?appType=1&curr=rub&dest=-1257786&lang=ru&spp=30&nm=${id}`;
    const response = await fetch(priceUrl, {
      headers: { Referer: "https://www.wildberries.ru/" },
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        data?: { products?: WBPriceProduct[] };
      };
      const priceProduct = payload.data?.products?.find((product) => product.id === id);
      const pairs =
        priceProduct?.sizes
          ?.map((size) => size.price)
          .filter((price): price is { basic: number; product?: number; total?: number } =>
            Boolean(price?.basic && (price.product || price.total)),
          )
          .map((price) => ({
            regular: price.basic / 100,
            current: (price.product || price.total || 0) / 100,
          })) || [];
      if (pairs.length) {
        const cheapest = pairs.sort((left, right) => left.current - right.current)[0];
        regularPrice = cheapest.regular;
        currentPrice = cheapest.current;
      } else if (priceProduct?.priceU && priceProduct.salePriceU) {
        regularPrice = priceProduct.priceU / 100;
        currentPrice = priceProduct.salePriceU / 100;
      }
    }
  } catch {
    // Keep card data; Python/Scrapling can retry the price endpoint directly.
  }

  const hasDiscount = Boolean(regularPrice && currentPrice && regularPrice > currentPrice);

  return {
    title,
    description,
    image,
    price: regularPrice ? String(hasDiscount ? regularPrice : currentPrice) : null,
    discount_price: hasDiscount && currentPrice ? String(currentPrice) : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: currentPrice ? "RUB" : null,
  };
};
