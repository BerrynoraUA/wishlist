/**
 * Maps app locales and currencies to the country flag shown beside them.
 *
 * Language → country is inherently a judgment call (a language is not a country),
 * so these are curated defaults, not derived. Currencies use the ISO 4217
 * convention that the first two letters are the ISO 3166-1 country code
 * (USD → US, EUR → EU, …).
 */
const LOCALE_TO_COUNTRY: Record<string, string> = {
  en: "gb",
  uk: "ua",
  de: "de",
  es: "es",
  fr: "fr",
  ja: "jp",
  it: "it",
  pt: "br", // app's Portuguese is Brazilian
  zh: "cn",
  pl: "pl",
  ko: "kr",
  nl: "nl",
  ru: "ru",
  hi: "in",
  tr: "tr",
  vi: "vn",
  th: "th",
  id: "id",
  cs: "cz",
  sk: "sk",
  hu: "hu",
  ro: "ro",
  bg: "bg",
  el: "gr",
  sv: "se",
  da: "dk",
  nb: "no",
  fi: "fi",
  hr: "hr",
  sr: "rs",
  sl: "si",
  lt: "lt",
  lv: "lv",
  et: "ee",
  bn: "bd",
  ms: "my",
  fil: "ph",
  "zh-Hant": "tw",
  ar: "sa",
  he: "il",
  fa: "ir",
  ur: "pk",
};

export function countryForLocale(locale: string): string | undefined {
  return LOCALE_TO_COUNTRY[locale] ?? LOCALE_TO_COUNTRY[locale.split(/[-_]/)[0]];
}

export function countryForCurrency(currencyCode: string): string {
  return currencyCode.trim().slice(0, 2).toLowerCase();
}
