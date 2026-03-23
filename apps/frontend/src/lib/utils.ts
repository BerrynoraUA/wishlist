export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  UAH: "₴",
  PLN: "zł",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF ",
};

/**
 * Formats a price string with the correct currency symbol.
 * Strips any existing leading currency symbol before prepending the correct one.
 * Falls back to USD if currency is null/undefined.
 * Accepts both string and number prices.
 */
export function formatItemPrice(
  price: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (price == null || price === "") return "";
  const code = currency ?? "USD";
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  if (typeof price === "number") {
    if (!Number.isFinite(price)) return "";
    return `${symbol}${price.toFixed(2)}`;
  }
  const clean = price.replace(/^[^\d,.]+/, "").trim();
  if (!clean) return "";
  return `${symbol}${clean}`;
}
