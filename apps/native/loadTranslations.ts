/**
 * Local bundles under `content/` (General Translation Expo quickstart).
 * Metro cannot resolve fully dynamic requires; locales are enumerated explicitly.
 */
const translations: Record<string, Record<string, unknown>> = {
  en: {},
  uk: require("@/content/uk.json"),
};

export async function loadTranslations(locale: string) {
  return translations[locale] ?? translations.en ?? {};
}
