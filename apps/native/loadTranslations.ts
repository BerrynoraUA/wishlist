/**
 * Local bundles under `content/` (General Translation Expo quickstart).
 * Metro cannot resolve fully dynamic requires; locales are enumerated explicitly.
 */
const translations: Record<string, Record<string, unknown>> = {
  en: {},
  uk: require("@/content/uk.json"),
  de: require("@/content/de.json"),
  es: require("@/content/es.json"),
  fr: require("@/content/fr.json"),
  ja: require("@/content/ja.json"),
  it: require("@/content/it.json"),
  pt: require("@/content/pt.json"),
  zh: require("@/content/zh.json"),
};

export async function loadTranslations(locale: string) {
  return translations[locale] ?? translations.en ?? {};
}
