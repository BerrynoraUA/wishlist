/**
 * FormatJS / Intl polyfills required by General Translation (`isValidLocale`, plural
 * selection, number and date formatting).
 *
 * `gt-react-native/plugin` injects every FormatJS polyfill plus locale data for all
 * 41 configured locales into `expo-router/entry` — roughly 10.6 MB of JavaScript that
 * Hermes has to run before the first frame. The plugin is disabled in
 * `babel.config.js`; this module replaces it, installing the same polyfills but only
 * the locale data for the locale in use.
 *
 * Locale data files guard themselves (`if (Intl.X && typeof Intl.X.__addLocaleData ===
 * "function")`), so requiring data for a family that was not polyfilled is a no-op.
 * Polyfills must therefore be installed before any locale data is required.
 */
import { getLocales } from "expo-localization";

const DEFAULT_LOCALE = "en";

/**
 * Metro cannot resolve dynamic require paths, so every locale is enumerated.
 * Generated from `locales` in `gt.config.json` — keep the two in sync.
 */
/**
 * Every family for one locale. Nothing here is touched until that locale is actually in
 * use, so a fresh install only ever materialises `en` plus the device language.
 *
 * Metro cannot resolve dynamic require paths, so every locale is enumerated.
 * Generated from `locales` in `gt.config.json` — keep the two in sync.
 */
const LOCALE_DATA: Record<string, () => void> = {
  en: () => {
    require("@formatjs/intl-displaynames/locale-data/en");
    require("@formatjs/intl-listformat/locale-data/en");
    require("@formatjs/intl-pluralrules/locale-data/en");
    require("@formatjs/intl-numberformat/locale-data/en");
    require("@formatjs/intl-relativetimeformat/locale-data/en");
    require("@formatjs/intl-datetimeformat/locale-data/en");
  },
  uk: () => {
    require("@formatjs/intl-displaynames/locale-data/uk");
    require("@formatjs/intl-listformat/locale-data/uk");
    require("@formatjs/intl-pluralrules/locale-data/uk");
    require("@formatjs/intl-numberformat/locale-data/uk");
    require("@formatjs/intl-relativetimeformat/locale-data/uk");
    require("@formatjs/intl-datetimeformat/locale-data/uk");
  },
  de: () => {
    require("@formatjs/intl-displaynames/locale-data/de");
    require("@formatjs/intl-listformat/locale-data/de");
    require("@formatjs/intl-pluralrules/locale-data/de");
    require("@formatjs/intl-numberformat/locale-data/de");
    require("@formatjs/intl-relativetimeformat/locale-data/de");
    require("@formatjs/intl-datetimeformat/locale-data/de");
  },
  es: () => {
    require("@formatjs/intl-displaynames/locale-data/es");
    require("@formatjs/intl-listformat/locale-data/es");
    require("@formatjs/intl-pluralrules/locale-data/es");
    require("@formatjs/intl-numberformat/locale-data/es");
    require("@formatjs/intl-relativetimeformat/locale-data/es");
    require("@formatjs/intl-datetimeformat/locale-data/es");
  },
  fr: () => {
    require("@formatjs/intl-displaynames/locale-data/fr");
    require("@formatjs/intl-listformat/locale-data/fr");
    require("@formatjs/intl-pluralrules/locale-data/fr");
    require("@formatjs/intl-numberformat/locale-data/fr");
    require("@formatjs/intl-relativetimeformat/locale-data/fr");
    require("@formatjs/intl-datetimeformat/locale-data/fr");
  },
  ja: () => {
    require("@formatjs/intl-displaynames/locale-data/ja");
    require("@formatjs/intl-listformat/locale-data/ja");
    require("@formatjs/intl-pluralrules/locale-data/ja");
    require("@formatjs/intl-numberformat/locale-data/ja");
    require("@formatjs/intl-relativetimeformat/locale-data/ja");
    require("@formatjs/intl-datetimeformat/locale-data/ja");
  },
  it: () => {
    require("@formatjs/intl-displaynames/locale-data/it");
    require("@formatjs/intl-listformat/locale-data/it");
    require("@formatjs/intl-pluralrules/locale-data/it");
    require("@formatjs/intl-numberformat/locale-data/it");
    require("@formatjs/intl-relativetimeformat/locale-data/it");
    require("@formatjs/intl-datetimeformat/locale-data/it");
  },
  pt: () => {
    require("@formatjs/intl-displaynames/locale-data/pt");
    require("@formatjs/intl-listformat/locale-data/pt");
    require("@formatjs/intl-pluralrules/locale-data/pt");
    require("@formatjs/intl-numberformat/locale-data/pt");
    require("@formatjs/intl-relativetimeformat/locale-data/pt");
    require("@formatjs/intl-datetimeformat/locale-data/pt");
  },
  zh: () => {
    require("@formatjs/intl-displaynames/locale-data/zh");
    require("@formatjs/intl-listformat/locale-data/zh");
    require("@formatjs/intl-pluralrules/locale-data/zh");
    require("@formatjs/intl-numberformat/locale-data/zh");
    require("@formatjs/intl-relativetimeformat/locale-data/zh");
    require("@formatjs/intl-datetimeformat/locale-data/zh");
  },
  pl: () => {
    require("@formatjs/intl-displaynames/locale-data/pl");
    require("@formatjs/intl-listformat/locale-data/pl");
    require("@formatjs/intl-pluralrules/locale-data/pl");
    require("@formatjs/intl-numberformat/locale-data/pl");
    require("@formatjs/intl-relativetimeformat/locale-data/pl");
    require("@formatjs/intl-datetimeformat/locale-data/pl");
  },
  ko: () => {
    require("@formatjs/intl-displaynames/locale-data/ko");
    require("@formatjs/intl-listformat/locale-data/ko");
    require("@formatjs/intl-pluralrules/locale-data/ko");
    require("@formatjs/intl-numberformat/locale-data/ko");
    require("@formatjs/intl-relativetimeformat/locale-data/ko");
    require("@formatjs/intl-datetimeformat/locale-data/ko");
  },
  nl: () => {
    require("@formatjs/intl-displaynames/locale-data/nl");
    require("@formatjs/intl-listformat/locale-data/nl");
    require("@formatjs/intl-pluralrules/locale-data/nl");
    require("@formatjs/intl-numberformat/locale-data/nl");
    require("@formatjs/intl-relativetimeformat/locale-data/nl");
    require("@formatjs/intl-datetimeformat/locale-data/nl");
  },
  hi: () => {
    require("@formatjs/intl-displaynames/locale-data/hi");
    require("@formatjs/intl-listformat/locale-data/hi");
    require("@formatjs/intl-pluralrules/locale-data/hi");
    require("@formatjs/intl-numberformat/locale-data/hi");
    require("@formatjs/intl-relativetimeformat/locale-data/hi");
    require("@formatjs/intl-datetimeformat/locale-data/hi");
  },
  tr: () => {
    require("@formatjs/intl-displaynames/locale-data/tr");
    require("@formatjs/intl-listformat/locale-data/tr");
    require("@formatjs/intl-pluralrules/locale-data/tr");
    require("@formatjs/intl-numberformat/locale-data/tr");
    require("@formatjs/intl-relativetimeformat/locale-data/tr");
    require("@formatjs/intl-datetimeformat/locale-data/tr");
  },
  vi: () => {
    require("@formatjs/intl-displaynames/locale-data/vi");
    require("@formatjs/intl-listformat/locale-data/vi");
    require("@formatjs/intl-pluralrules/locale-data/vi");
    require("@formatjs/intl-numberformat/locale-data/vi");
    require("@formatjs/intl-relativetimeformat/locale-data/vi");
    require("@formatjs/intl-datetimeformat/locale-data/vi");
  },
  th: () => {
    require("@formatjs/intl-displaynames/locale-data/th");
    require("@formatjs/intl-listformat/locale-data/th");
    require("@formatjs/intl-pluralrules/locale-data/th");
    require("@formatjs/intl-numberformat/locale-data/th");
    require("@formatjs/intl-relativetimeformat/locale-data/th");
    require("@formatjs/intl-datetimeformat/locale-data/th");
  },
  id: () => {
    require("@formatjs/intl-displaynames/locale-data/id");
    require("@formatjs/intl-listformat/locale-data/id");
    require("@formatjs/intl-pluralrules/locale-data/id");
    require("@formatjs/intl-numberformat/locale-data/id");
    require("@formatjs/intl-relativetimeformat/locale-data/id");
    require("@formatjs/intl-datetimeformat/locale-data/id");
  },
  cs: () => {
    require("@formatjs/intl-displaynames/locale-data/cs");
    require("@formatjs/intl-listformat/locale-data/cs");
    require("@formatjs/intl-pluralrules/locale-data/cs");
    require("@formatjs/intl-numberformat/locale-data/cs");
    require("@formatjs/intl-relativetimeformat/locale-data/cs");
    require("@formatjs/intl-datetimeformat/locale-data/cs");
  },
  sk: () => {
    require("@formatjs/intl-displaynames/locale-data/sk");
    require("@formatjs/intl-listformat/locale-data/sk");
    require("@formatjs/intl-pluralrules/locale-data/sk");
    require("@formatjs/intl-numberformat/locale-data/sk");
    require("@formatjs/intl-relativetimeformat/locale-data/sk");
    require("@formatjs/intl-datetimeformat/locale-data/sk");
  },
  hu: () => {
    require("@formatjs/intl-displaynames/locale-data/hu");
    require("@formatjs/intl-listformat/locale-data/hu");
    require("@formatjs/intl-pluralrules/locale-data/hu");
    require("@formatjs/intl-numberformat/locale-data/hu");
    require("@formatjs/intl-relativetimeformat/locale-data/hu");
    require("@formatjs/intl-datetimeformat/locale-data/hu");
  },
  ro: () => {
    require("@formatjs/intl-displaynames/locale-data/ro");
    require("@formatjs/intl-listformat/locale-data/ro");
    require("@formatjs/intl-pluralrules/locale-data/ro");
    require("@formatjs/intl-numberformat/locale-data/ro");
    require("@formatjs/intl-relativetimeformat/locale-data/ro");
    require("@formatjs/intl-datetimeformat/locale-data/ro");
  },
  bg: () => {
    require("@formatjs/intl-displaynames/locale-data/bg");
    require("@formatjs/intl-listformat/locale-data/bg");
    require("@formatjs/intl-pluralrules/locale-data/bg");
    require("@formatjs/intl-numberformat/locale-data/bg");
    require("@formatjs/intl-relativetimeformat/locale-data/bg");
    require("@formatjs/intl-datetimeformat/locale-data/bg");
  },
  el: () => {
    require("@formatjs/intl-displaynames/locale-data/el");
    require("@formatjs/intl-listformat/locale-data/el");
    require("@formatjs/intl-pluralrules/locale-data/el");
    require("@formatjs/intl-numberformat/locale-data/el");
    require("@formatjs/intl-relativetimeformat/locale-data/el");
    require("@formatjs/intl-datetimeformat/locale-data/el");
  },
  sv: () => {
    require("@formatjs/intl-displaynames/locale-data/sv");
    require("@formatjs/intl-listformat/locale-data/sv");
    require("@formatjs/intl-pluralrules/locale-data/sv");
    require("@formatjs/intl-numberformat/locale-data/sv");
    require("@formatjs/intl-relativetimeformat/locale-data/sv");
    require("@formatjs/intl-datetimeformat/locale-data/sv");
  },
  da: () => {
    require("@formatjs/intl-displaynames/locale-data/da");
    require("@formatjs/intl-listformat/locale-data/da");
    require("@formatjs/intl-pluralrules/locale-data/da");
    require("@formatjs/intl-numberformat/locale-data/da");
    require("@formatjs/intl-relativetimeformat/locale-data/da");
    require("@formatjs/intl-datetimeformat/locale-data/da");
  },
  nb: () => {
    require("@formatjs/intl-displaynames/locale-data/nb");
    require("@formatjs/intl-listformat/locale-data/nb");
    require("@formatjs/intl-pluralrules/locale-data/nb");
    require("@formatjs/intl-numberformat/locale-data/nb");
    require("@formatjs/intl-relativetimeformat/locale-data/nb");
    require("@formatjs/intl-datetimeformat/locale-data/nb");
  },
  fi: () => {
    require("@formatjs/intl-displaynames/locale-data/fi");
    require("@formatjs/intl-listformat/locale-data/fi");
    require("@formatjs/intl-pluralrules/locale-data/fi");
    require("@formatjs/intl-numberformat/locale-data/fi");
    require("@formatjs/intl-relativetimeformat/locale-data/fi");
    require("@formatjs/intl-datetimeformat/locale-data/fi");
  },
  hr: () => {
    require("@formatjs/intl-displaynames/locale-data/hr");
    require("@formatjs/intl-listformat/locale-data/hr");
    require("@formatjs/intl-pluralrules/locale-data/hr");
    require("@formatjs/intl-numberformat/locale-data/hr");
    require("@formatjs/intl-relativetimeformat/locale-data/hr");
    require("@formatjs/intl-datetimeformat/locale-data/hr");
  },
  sr: () => {
    require("@formatjs/intl-displaynames/locale-data/sr");
    require("@formatjs/intl-listformat/locale-data/sr");
    require("@formatjs/intl-pluralrules/locale-data/sr");
    require("@formatjs/intl-numberformat/locale-data/sr");
    require("@formatjs/intl-relativetimeformat/locale-data/sr");
    require("@formatjs/intl-datetimeformat/locale-data/sr");
  },
  sl: () => {
    require("@formatjs/intl-displaynames/locale-data/sl");
    require("@formatjs/intl-listformat/locale-data/sl");
    require("@formatjs/intl-pluralrules/locale-data/sl");
    require("@formatjs/intl-numberformat/locale-data/sl");
    require("@formatjs/intl-relativetimeformat/locale-data/sl");
    require("@formatjs/intl-datetimeformat/locale-data/sl");
  },
  lt: () => {
    require("@formatjs/intl-displaynames/locale-data/lt");
    require("@formatjs/intl-listformat/locale-data/lt");
    require("@formatjs/intl-pluralrules/locale-data/lt");
    require("@formatjs/intl-numberformat/locale-data/lt");
    require("@formatjs/intl-relativetimeformat/locale-data/lt");
    require("@formatjs/intl-datetimeformat/locale-data/lt");
  },
  lv: () => {
    require("@formatjs/intl-displaynames/locale-data/lv");
    require("@formatjs/intl-listformat/locale-data/lv");
    require("@formatjs/intl-pluralrules/locale-data/lv");
    require("@formatjs/intl-numberformat/locale-data/lv");
    require("@formatjs/intl-relativetimeformat/locale-data/lv");
    require("@formatjs/intl-datetimeformat/locale-data/lv");
  },
  et: () => {
    require("@formatjs/intl-displaynames/locale-data/et");
    require("@formatjs/intl-listformat/locale-data/et");
    require("@formatjs/intl-pluralrules/locale-data/et");
    require("@formatjs/intl-numberformat/locale-data/et");
    require("@formatjs/intl-relativetimeformat/locale-data/et");
    require("@formatjs/intl-datetimeformat/locale-data/et");
  },
  bn: () => {
    require("@formatjs/intl-displaynames/locale-data/bn");
    require("@formatjs/intl-listformat/locale-data/bn");
    require("@formatjs/intl-pluralrules/locale-data/bn");
    require("@formatjs/intl-numberformat/locale-data/bn");
    require("@formatjs/intl-relativetimeformat/locale-data/bn");
    require("@formatjs/intl-datetimeformat/locale-data/bn");
  },
  ms: () => {
    require("@formatjs/intl-displaynames/locale-data/ms");
    require("@formatjs/intl-listformat/locale-data/ms");
    require("@formatjs/intl-pluralrules/locale-data/ms");
    require("@formatjs/intl-numberformat/locale-data/ms");
    require("@formatjs/intl-relativetimeformat/locale-data/ms");
    require("@formatjs/intl-datetimeformat/locale-data/ms");
  },
  fil: () => {
    require("@formatjs/intl-displaynames/locale-data/fil");
    require("@formatjs/intl-listformat/locale-data/fil");
    require("@formatjs/intl-pluralrules/locale-data/fil");
    require("@formatjs/intl-numberformat/locale-data/fil");
    require("@formatjs/intl-relativetimeformat/locale-data/fil");
    require("@formatjs/intl-datetimeformat/locale-data/fil");
  },
  "zh-Hant": () => {
    require("@formatjs/intl-displaynames/locale-data/zh-Hant");
    require("@formatjs/intl-listformat/locale-data/zh-Hant");
    require("@formatjs/intl-numberformat/locale-data/zh-Hant");
    require("@formatjs/intl-relativetimeformat/locale-data/zh-Hant");
    require("@formatjs/intl-datetimeformat/locale-data/zh-Hant");
  },
  ar: () => {
    require("@formatjs/intl-displaynames/locale-data/ar");
    require("@formatjs/intl-listformat/locale-data/ar");
    require("@formatjs/intl-pluralrules/locale-data/ar");
    require("@formatjs/intl-numberformat/locale-data/ar");
    require("@formatjs/intl-relativetimeformat/locale-data/ar");
    require("@formatjs/intl-datetimeformat/locale-data/ar");
  },
  he: () => {
    require("@formatjs/intl-displaynames/locale-data/he");
    require("@formatjs/intl-listformat/locale-data/he");
    require("@formatjs/intl-pluralrules/locale-data/he");
    require("@formatjs/intl-numberformat/locale-data/he");
    require("@formatjs/intl-relativetimeformat/locale-data/he");
    require("@formatjs/intl-datetimeformat/locale-data/he");
  },
  fa: () => {
    require("@formatjs/intl-displaynames/locale-data/fa");
    require("@formatjs/intl-listformat/locale-data/fa");
    require("@formatjs/intl-pluralrules/locale-data/fa");
    require("@formatjs/intl-numberformat/locale-data/fa");
    require("@formatjs/intl-relativetimeformat/locale-data/fa");
    require("@formatjs/intl-datetimeformat/locale-data/fa");
  },
  ur: () => {
    require("@formatjs/intl-displaynames/locale-data/ur");
    require("@formatjs/intl-listformat/locale-data/ur");
    require("@formatjs/intl-pluralrules/locale-data/ur");
    require("@formatjs/intl-numberformat/locale-data/ur");
    require("@formatjs/intl-relativetimeformat/locale-data/ur");
    require("@formatjs/intl-datetimeformat/locale-data/ur");
  },
};

let polyfillsInstalled = false;
const loadedLocales = new Set<string>();

function installPolyfills() {
  if (polyfillsInstalled) return;
  polyfillsInstalled = true;

  // Same entry points, in the same order, as the Babel plugin used to inject. Each
  // `polyfill` module decides internally whether this engine needs it.
  //
  // These must run before any route module, which is why `index.js` is the app entry:
  // `generaltranslation` copies the Intl constructors into a private table the first
  // time it evaluates, and builds from that snapshot forever after. Installing later
  // leaves the snapshot holding Hermes' own implementations, and GT then rejects every
  // configured locale with "Invalid locale codes in your configuration".
  //
  // Each entry is isolated: these polyfills are independent, and one blowing up on a
  // given engine must not stop the rest — losing `Intl.Locale` because, say,
  // DateTimeFormat threw is what turns a cosmetic gap into a startup crash.
  const steps: [string, () => void][] = [
    ["getcanonicallocales", () => require("@formatjs/intl-getcanonicallocales/polyfill")],
    ["locale", () => require("@formatjs/intl-locale/polyfill")],
    // Forced: a native DisplayNames without ICU display-name data returns the locale code
    // unchanged, which GT reads as invalid.
    ["displaynames", () => require("@formatjs/intl-displaynames/polyfill-force")],
    ["listformat", () => require("@formatjs/intl-listformat/polyfill")],
    // Forced: Hermes reports support but returns wrong plural categories
    // (formatjs/formatjs#4463), which GT relies on for message selection.
    ["pluralrules", () => require("@formatjs/intl-pluralrules/polyfill-force")],
    ["numberformat", () => require("@formatjs/intl-numberformat/polyfill")],
    ["relativetimeformat", () => require("@formatjs/intl-relativetimeformat/polyfill")],
    [
      "datetimeformat",
      () => {
        // The only family gated from the outside, and the only one where it pays: its
        // `polyfill` entry pulls ~1.5 MB of implementation *before* deciding it is not
        // needed, plus 1.35 MB of zone data. `shouldPolyfill` is the same check that
        // entry runs internally, so the outcome is identical — only the cost differs.
        //
        // Safe to gate precisely because nothing else leans on `Intl.DateTimeFormat`:
        // GT validates locales through `Intl.Locale` and `Intl.DisplayNames`, and the
        // forced DisplayNames polyfill calls into `Intl.Locale`. Those stay unconditional.
        const { shouldPolyfill } = require("@formatjs/intl-datetimeformat/should-polyfill");
        if (!shouldPolyfill()) return;

        require("@formatjs/intl-datetimeformat/polyfill");
        require("@formatjs/intl-datetimeformat/add-all-tz");
      },
    ],
  ];

  for (const [name, install] of steps) {
    try {
      install();
    } catch (error) {
      console.warn(`[intl] "${name}" polyfill failed to install`, error);
    }
  }
}

/** Narrows a BCP 47 tag (`uk-UA`, `zh-Hant-TW`) to a locale present in LOCALE_DATA. */
function resolveLocale(tag: string | null | undefined): string {
  if (!tag) return DEFAULT_LOCALE;
  if (tag in LOCALE_DATA) return tag;

  const [language, script] = tag.split("-");
  if (script && `${language}-${script}` in LOCALE_DATA) return `${language}-${script}`;
  return language in LOCALE_DATA ? language : DEFAULT_LOCALE;
}

/**
 * Installs the Intl polyfills (once) and the locale data for `tag`. Safe and cheap to
 * call repeatedly; each locale's data is loaded at most once.
 */
export function ensureIntlLocale(tag: string | null | undefined) {
  installPolyfills();

  const locale = resolveLocale(tag);
  if (loadedLocales.has(locale)) return;
  loadedLocales.add(locale);
  LOCALE_DATA[locale]?.();
}

// Prime with the device locale so Intl is usable before GTProvider first renders.
// `en` is GT's fallback locale, so its data is always needed.
ensureIntlLocale(DEFAULT_LOCALE);
try {
  ensureIntlLocale(getLocales()[0]?.languageTag);
} catch {
  // This runs while the module graph is still evaluating. Reading the device locale is
  // only a head start — `IntlLocaleGate` loads the resolved locale during render — so a
  // native module that is not ready yet must not take the whole app down.
}
