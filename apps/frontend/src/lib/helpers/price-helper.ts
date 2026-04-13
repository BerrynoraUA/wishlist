import { CURRENCY_SYMBOLS, normalizeCurrencyCode } from "@/lib/currencies";

export function formatItemPrice(
  price: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (price == null || price === "") return "";
  const code = normalizeCurrencyCode(currency);
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  if (typeof price === "number") {
    if (!Number.isFinite(price)) return "";
    return `${symbol}${price.toFixed(2)}`;
  }
  const clean = price.replace(/^[^\d,.]+/, "").trim();
  if (!clean) return "";
  return `${symbol}${clean}`;
}

export function parsePriceString(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const safe = trimmed.replace(/[^0-9,.-]/g, "");
  if (!safe) return null;

  const hasComma = safe.includes(",");
  const hasDot = safe.includes(".");
  const normalized = hasComma && hasDot ? safe.replace(/,/g, "") : safe.replace(/,/g, ".");

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export function convertPrice(
  price: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number | null {
  const normalizedFrom = normalizeCurrencyCode(fromCurrency);
  const normalizedTo = normalizeCurrencyCode(toCurrency);

  if (normalizedFrom === normalizedTo) return price;

  const fromRate = rates[normalizedFrom];
  const toRate = rates[normalizedTo];

  if (!fromRate || !toRate) return null;

  const priceInUsd = price / fromRate;
  return priceInUsd * toRate;
}

export function formatConvertedPrice(
  price: string | number | null | undefined,
  itemCurrency: string | null | undefined,
  displayCurrency: string,
  rates: Record<string, number>,
): string {
  const numericPrice = parsePriceString(price);
  if (numericPrice == null) return formatItemPrice(price, itemCurrency);

  const from = normalizeCurrencyCode(itemCurrency);
  const to = normalizeCurrencyCode(displayCurrency);

  if (from === to || !rates[from] || !rates[to]) {
    return formatItemPrice(price, itemCurrency);
  }

  const converted = convertPrice(numericPrice, from, to, rates);
  if (converted == null) return formatItemPrice(price, itemCurrency);

  return formatItemPrice(converted, to);
}
