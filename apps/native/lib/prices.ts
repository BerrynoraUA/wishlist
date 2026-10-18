import { parseItemPriceToNumber } from "@/lib/items";
import { CURRENCY_SYMBOLS, normalizeCurrencyCode } from "@wishlist/backend/lib/currencies";

/** Mirrors the web app's `price-helper.ts`, so both clients convert prices the same way. */
export function formatItemPrice(
  price: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (price == null || price === "") return "";
  const code = normalizeCurrencyCode(currency);
  const mark = CURRENCY_SYMBOLS[code] ?? code;
  // Several "symbols" are codes or abbreviations ("EUR", "kr"); those read badly glued on.
  const symbol = /\p{L}$/u.test(mark) ? `${mark} ` : mark;
  if (typeof price === "number") {
    if (!Number.isFinite(price)) return "";
    return `${symbol}${price.toFixed(2)}`;
  }
  const clean = price.replace(/^[^\d,.]+/, "").trim();
  if (!clean) return "";
  return `${symbol}${clean}`;
}

/** Rates are units per USD, as stored in `exchange_rates`. */
export function convertPrice(
  price: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number | null {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return price;

  const fromRate = from === "USD" ? 1 : rates[from];
  const toRate = to === "USD" ? 1 : rates[to];
  if (!fromRate || !toRate) return null;

  return (price / fromRate) * toRate;
}

/** Falls back to the item's own currency whenever a rate is missing or the price won't parse. */
export function formatConvertedPrice(
  price: string | number | null | undefined,
  itemCurrency: string | null | undefined,
  displayCurrency: string,
  rates: Record<string, number> | undefined,
): string {
  const numericPrice = parseItemPriceToNumber(price);
  if (numericPrice == null || !rates) return formatItemPrice(price, itemCurrency);

  const to = normalizeCurrencyCode(displayCurrency);
  const converted = convertPrice(numericPrice, normalizeCurrencyCode(itemCurrency), to, rates);
  if (converted == null || normalizeCurrencyCode(itemCurrency) === to) {
    return formatItemPrice(price, itemCurrency);
  }

  return formatItemPrice(converted, to);
}
