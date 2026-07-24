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
  pl: require("@/content/pl.json"),
  ko: require("@/content/ko.json"),
  nl: require("@/content/nl.json"),
  ru: require("@/content/ru.json"),
  hi: require("@/content/hi.json"),
  tr: require("@/content/tr.json"),
  vi: require("@/content/vi.json"),
  th: require("@/content/th.json"),
  id: require("@/content/id.json"),
  cs: require("@/content/cs.json"),
  sk: require("@/content/sk.json"),
  hu: require("@/content/hu.json"),
  ro: require("@/content/ro.json"),
  bg: require("@/content/bg.json"),
  el: require("@/content/el.json"),
  sv: require("@/content/sv.json"),
  da: require("@/content/da.json"),
  nb: require("@/content/nb.json"),
  fi: require("@/content/fi.json"),
  hr: require("@/content/hr.json"),
  sr: require("@/content/sr.json"),
  sl: require("@/content/sl.json"),
  lt: require("@/content/lt.json"),
  lv: require("@/content/lv.json"),
  et: require("@/content/et.json"),
  bn: require("@/content/bn.json"),
  ms: require("@/content/ms.json"),
  fil: require("@/content/fil.json"),
  "zh-Hant": require("@/content/zh-Hant.json"),
  ar: require("@/content/ar.json"),
  he: require("@/content/he.json"),
  fa: require("@/content/fa.json"),
  ur: require("@/content/ur.json"),
};

export async function loadTranslations(locale: string) {
  return translations[locale] ?? translations.en ?? {};
}
