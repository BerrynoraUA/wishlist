export type SupportedCurrency = {
  code: string;
  label: string;
  symbol: string;
};

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "EUR" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "UAH", label: "Ukrainian Hryvnia", symbol: "₴" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "BGN", label: "Bulgarian Lev", symbol: "лв" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", label: "Chinese Yuan", symbol: "CN¥" },
  { code: "CZK", label: "Czech Koruna", symbol: "Kc" },
  { code: "DKK", label: "Danish Krone", symbol: "kr" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { code: "HUF", label: "Hungarian Forint", symbol: "Ft" },
  { code: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { code: "ILS", label: "Israeli New Shekel", symbol: "ILS" },
  { code: "INR", label: "Indian Rupee", symbol: "Rs" },
  { code: "ISK", label: "Icelandic Krona", symbol: "kr" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "KRW", label: "South Korean Won", symbol: "₩" },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
  { code: "MYR", label: "Malaysian Ringgit", symbol: "RM" },
  { code: "NOK", label: "Norwegian Krone", symbol: "kr" },
  { code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { code: "PHP", label: "Philippine Peso", symbol: "₱" },
  { code: "PLN", label: "Polish Zloty", symbol: "zl" },
  { code: "RON", label: "Romanian Leu", symbol: "lei" },
  { code: "SEK", label: "Swedish Krona", symbol: "kr" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "THB", label: "Thai Baht", symbol: "฿" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
];

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((currency) => [currency.code, currency.symbol]),
);

const SUPPORTED_CURRENCY_CODES = new Set(SUPPORTED_CURRENCIES.map((currency) => currency.code));

/**
 * Scraped currencies are usually ISO codes, but some stores only expose a symbol or a local
 * abbreviation. Only unambiguous aliases live here — `kr` (DKK/NOK/SEK/ISK) and a bare `¥`
 * (JPY/CNY) are deliberately left out so a guess never overwrites a correct selection.
 */
const CURRENCY_ALIASES: Record<string, string> = {
  $: "USD",
  US$: "USD",
  USD$: "USD",
  "＄": "USD",
  "€": "EUR",
  "£": "GBP",
  "₴": "UAH",
  ГРН: "UAH",
  ГРИВНЯ: "UAH",
  DH: "AED",
  DHS: "AED",
  A$: "AUD",
  AU$: "AUD",
  ЛВ: "BGN",
  LEV: "BGN",
  R$: "BRL",
  C$: "CAD",
  CA$: "CAD",
  CDN$: "CAD",
  SFR: "CHF",
  FR: "CHF",
  "CN¥": "CNY",
  RMB: "CNY",
  KČ: "CZK",
  KC: "CZK",
  DKR: "DKK",
  HK$: "HKD",
  FT: "HUF",
  RP: "IDR",
  "₪": "ILS",
  NIS: "ILS",
  "₹": "INR",
  RS: "INR",
  IKR: "ISK",
  "¥": "JPY",
  "￥": "JPY",
  円: "JPY",
  "₩": "KRW",
  MX$: "MXN",
  RM: "MYR",
  NKR: "NOK",
  NZ$: "NZD",
  "₱": "PHP",
  ZŁ: "PLN",
  ZL: "PLN",
  LEI: "RON",
  SKR: "SEK",
  S$: "SGD",
  "฿": "THB",
  "₺": "TRY",
  TL: "TRY",
};

/**
 * Maps an arbitrary scraped currency string onto a code we actually support, or `null` when
 * it can't be mapped (unknown symbol, or a real code we don't offer, e.g. RUB). Callers should
 * treat `null` as "keep the current selection" rather than falling back to a wrong currency.
 */
export function resolveSupportedCurrency(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase().replace(/[.\s]/g, "");
  if (!normalized) return null;
  if (SUPPORTED_CURRENCY_CODES.has(normalized)) return normalized;

  const alias = CURRENCY_ALIASES[normalized];
  return alias && SUPPORTED_CURRENCY_CODES.has(alias) ? alias : null;
}

export const ECB_SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(
  (currency) => currency.code,
).filter((code) => code !== "USD" && code !== "UAH");

export function normalizeCurrencyCode(currency: string | null | undefined): string {
  const normalized = currency?.trim().toUpperCase();
  return normalized || "USD";
}
