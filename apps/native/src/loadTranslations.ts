/**
 * Local bundles under `src/_gt/` (see General Translation Expo quickstart).
 * Metro cannot resolve fully dynamic requires; locales are enumerated explicitly.
 */
const translations: Record<string, Record<string, unknown>> = {
  uk: require("@/_gt/uk.json"),
};

export async function loadTranslations(locale: string) {
  return translations[locale] ?? {};
}
