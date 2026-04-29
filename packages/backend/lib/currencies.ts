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

export const ECB_SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(
  (currency) => currency.code,
).filter((code) => code !== "USD" && code !== "UAH");

export function normalizeCurrencyCode(currency: string | null | undefined): string {
  const normalized = currency?.trim().toUpperCase();
  return normalized || "USD";
}
