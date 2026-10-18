import { normalizeCurrencyCode } from "./currencies";

/** Exchange rates as stored in `exchange_rates`: units of each currency per 1 USD. */
export type ExchangeRateTable = Record<string, number>;

export interface PriceDisplay {
  /** Currency to show prices in; prices stay in their own currency when no rate exists. */
  currency: string;
  rates?: ExchangeRateTable;
  /** Drop the cents and show the nearest whole amount. */
  round?: boolean;
  /** BCP 47 locale for separators and symbol placement; the runtime default when omitted. */
  locale?: string;
}

/**
 * Reads a stored price ("1,234.50", "19,99", "EUR 12") as a number. Item prices are free text,
 * so anything without digits is `null`.
 */
export function parsePrice(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const digits = value.trim().replace(/[^0-9,.-]/g, "");
  if (!digits) return null;

  // With both separators the comma groups thousands; alone it is a decimal comma.
  const normalized =
    digits.includes(",") && digits.includes(".")
      ? digits.replace(/,/g, "")
      : digits.replace(/,/g, ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

/** Converts through USD, which has no row of its own. `null` when either rate is unknown. */
export function convertPrice(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRateTable,
): number | null {
  const fromCode = normalizeCurrencyCode(from);
  const toCode = normalizeCurrencyCode(to);
  if (fromCode === toCode) return amount;

  const rate = (code: string) => (code === "USD" ? 1 : rates[code]);
  const fromRate = rate(fromCode);
  const toRate = rate(toCode);
  if (!fromRate || !toRate) return null;

  return (amount / fromRate) * toRate;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Building an `Intl.NumberFormat` is slow on Hermes, and list rows format on every render. */
function numberFormat(locale: string | undefined, options: Intl.NumberFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

/** Formats an amount that is already in `currency`. Whole amounts never show ".00". */
export function formatMoney(
  amount: number,
  currency: string | null | undefined,
  { round = false, locale }: Pick<PriceDisplay, "round" | "locale"> = {},
): string {
  const code = normalizeCurrencyCode(currency);
  const value = round ? Math.round(amount) : amount;
  const whole = Number.isInteger(value);

  // Stored currencies are scraped text; anything that is not an ISO code still gets a label.
  if (!/^[A-Z]{3}$/.test(code)) {
    const digits = whole ? 0 : 2;
    const number = numberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return `${code} ${number.format(value)}`;
  }
  // Otherwise the currency's own precision applies (2 for EUR, 0 for JPY).
  return numberFormat(locale, {
    style: "currency",
    currency: code,
    ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  }).format(value);
}

/**
 * Formats a stored item price for display: converted into the display currency when a rate
 * exists, otherwise in the item's own currency. Prices that don't parse format as "".
 */
export function formatPrice(
  price: string | number | null | undefined,
  itemCurrency: string | null | undefined,
  { currency, rates, round, locale }: PriceDisplay,
): string {
  const amount = parsePrice(price);
  if (amount == null) return "";

  const converted = rates
    ? convertPrice(amount, normalizeCurrencyCode(itemCurrency), currency, rates)
    : null;
  return converted == null
    ? formatMoney(amount, itemCurrency, { round, locale })
    : formatMoney(converted, currency, { round, locale });
}
