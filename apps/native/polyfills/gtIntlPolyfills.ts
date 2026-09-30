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
    require("@formatjs/intl-displaynames/locale-data/en.js");
    require("@formatjs/intl-listformat/locale-data/en.js");
    require("@formatjs/intl-pluralrules/locale-data/en.js");
    require("@formatjs/intl-numberformat/locale-data/en.js");
    require("@formatjs/intl-relativetimeformat/locale-data/en.js");
    require("@formatjs/intl-datetimeformat/locale-data/en.js");
  },
  uk: () => {
    require("@formatjs/intl-displaynames/locale-data/uk.js");
    require("@formatjs/intl-listformat/locale-data/uk.js");
    require("@formatjs/intl-pluralrules/locale-data/uk.js");
    require("@formatjs/intl-numberformat/locale-data/uk.js");
    require("@formatjs/intl-relativetimeformat/locale-data/uk.js");
    require("@formatjs/intl-datetimeformat/locale-data/uk.js");
  },
  de: () => {
    require("@formatjs/intl-displaynames/locale-data/de.js");
    require("@formatjs/intl-listformat/locale-data/de.js");
    require("@formatjs/intl-pluralrules/locale-data/de.js");
    require("@formatjs/intl-numberformat/locale-data/de.js");
    require("@formatjs/intl-relativetimeformat/locale-data/de.js");
    require("@formatjs/intl-datetimeformat/locale-data/de.js");
  },
  es: () => {
    require("@formatjs/intl-displaynames/locale-data/es.js");
    require("@formatjs/intl-listformat/locale-data/es.js");
    require("@formatjs/intl-pluralrules/locale-data/es.js");
    require("@formatjs/intl-numberformat/locale-data/es.js");
    require("@formatjs/intl-relativetimeformat/locale-data/es.js");
    require("@formatjs/intl-datetimeformat/locale-data/es.js");
  },
  fr: () => {
    require("@formatjs/intl-displaynames/locale-data/fr.js");
    require("@formatjs/intl-listformat/locale-data/fr.js");
    require("@formatjs/intl-pluralrules/locale-data/fr.js");
    require("@formatjs/intl-numberformat/locale-data/fr.js");
    require("@formatjs/intl-relativetimeformat/locale-data/fr.js");
    require("@formatjs/intl-datetimeformat/locale-data/fr.js");
  },
  ja: () => {
    require("@formatjs/intl-displaynames/locale-data/ja.js");
    require("@formatjs/intl-listformat/locale-data/ja.js");
    require("@formatjs/intl-pluralrules/locale-data/ja.js");
    require("@formatjs/intl-numberformat/locale-data/ja.js");
    require("@formatjs/intl-relativetimeformat/locale-data/ja.js");
    require("@formatjs/intl-datetimeformat/locale-data/ja.js");
  },
  it: () => {
    require("@formatjs/intl-displaynames/locale-data/it.js");
    require("@formatjs/intl-listformat/locale-data/it.js");
    require("@formatjs/intl-pluralrules/locale-data/it.js");
    require("@formatjs/intl-numberformat/locale-data/it.js");
    require("@formatjs/intl-relativetimeformat/locale-data/it.js");
    require("@formatjs/intl-datetimeformat/locale-data/it.js");
  },
  pt: () => {
    require("@formatjs/intl-displaynames/locale-data/pt.js");
    require("@formatjs/intl-listformat/locale-data/pt.js");
    require("@formatjs/intl-pluralrules/locale-data/pt.js");
    require("@formatjs/intl-numberformat/locale-data/pt.js");
    require("@formatjs/intl-relativetimeformat/locale-data/pt.js");
    require("@formatjs/intl-datetimeformat/locale-data/pt.js");
  },
  zh: () => {
    require("@formatjs/intl-displaynames/locale-data/zh.js");
    require("@formatjs/intl-listformat/locale-data/zh.js");
    require("@formatjs/intl-pluralrules/locale-data/zh.js");
    require("@formatjs/intl-numberformat/locale-data/zh.js");
    require("@formatjs/intl-relativetimeformat/locale-data/zh.js");
    require("@formatjs/intl-datetimeformat/locale-data/zh.js");
  },
  pl: () => {
    require("@formatjs/intl-displaynames/locale-data/pl.js");
    require("@formatjs/intl-listformat/locale-data/pl.js");
    require("@formatjs/intl-pluralrules/locale-data/pl.js");
    require("@formatjs/intl-numberformat/locale-data/pl.js");
    require("@formatjs/intl-relativetimeformat/locale-data/pl.js");
    require("@formatjs/intl-datetimeformat/locale-data/pl.js");
  },
  ko: () => {
    require("@formatjs/intl-displaynames/locale-data/ko.js");
    require("@formatjs/intl-listformat/locale-data/ko.js");
    require("@formatjs/intl-pluralrules/locale-data/ko.js");
    require("@formatjs/intl-numberformat/locale-data/ko.js");
    require("@formatjs/intl-relativetimeformat/locale-data/ko.js");
    require("@formatjs/intl-datetimeformat/locale-data/ko.js");
  },
  nl: () => {
    require("@formatjs/intl-displaynames/locale-data/nl.js");
    require("@formatjs/intl-listformat/locale-data/nl.js");
    require("@formatjs/intl-pluralrules/locale-data/nl.js");
    require("@formatjs/intl-numberformat/locale-data/nl.js");
    require("@formatjs/intl-relativetimeformat/locale-data/nl.js");
    require("@formatjs/intl-datetimeformat/locale-data/nl.js");
  },
  hi: () => {
    require("@formatjs/intl-displaynames/locale-data/hi.js");
    require("@formatjs/intl-listformat/locale-data/hi.js");
    require("@formatjs/intl-pluralrules/locale-data/hi.js");
    require("@formatjs/intl-numberformat/locale-data/hi.js");
    require("@formatjs/intl-relativetimeformat/locale-data/hi.js");
    require("@formatjs/intl-datetimeformat/locale-data/hi.js");
  },
  tr: () => {
    require("@formatjs/intl-displaynames/locale-data/tr.js");
    require("@formatjs/intl-listformat/locale-data/tr.js");
    require("@formatjs/intl-pluralrules/locale-data/tr.js");
    require("@formatjs/intl-numberformat/locale-data/tr.js");
    require("@formatjs/intl-relativetimeformat/locale-data/tr.js");
    require("@formatjs/intl-datetimeformat/locale-data/tr.js");
  },
  vi: () => {
    require("@formatjs/intl-displaynames/locale-data/vi.js");
    require("@formatjs/intl-listformat/locale-data/vi.js");
    require("@formatjs/intl-pluralrules/locale-data/vi.js");
    require("@formatjs/intl-numberformat/locale-data/vi.js");
    require("@formatjs/intl-relativetimeformat/locale-data/vi.js");
    require("@formatjs/intl-datetimeformat/locale-data/vi.js");
  },
  th: () => {
    require("@formatjs/intl-displaynames/locale-data/th.js");
    require("@formatjs/intl-listformat/locale-data/th.js");
    require("@formatjs/intl-pluralrules/locale-data/th.js");
    require("@formatjs/intl-numberformat/locale-data/th.js");
    require("@formatjs/intl-relativetimeformat/locale-data/th.js");
    require("@formatjs/intl-datetimeformat/locale-data/th.js");
  },
  id: () => {
    require("@formatjs/intl-displaynames/locale-data/id.js");
    require("@formatjs/intl-listformat/locale-data/id.js");
    require("@formatjs/intl-pluralrules/locale-data/id.js");
    require("@formatjs/intl-numberformat/locale-data/id.js");
    require("@formatjs/intl-relativetimeformat/locale-data/id.js");
    require("@formatjs/intl-datetimeformat/locale-data/id.js");
  },
  cs: () => {
    require("@formatjs/intl-displaynames/locale-data/cs.js");
    require("@formatjs/intl-listformat/locale-data/cs.js");
    require("@formatjs/intl-pluralrules/locale-data/cs.js");
    require("@formatjs/intl-numberformat/locale-data/cs.js");
    require("@formatjs/intl-relativetimeformat/locale-data/cs.js");
    require("@formatjs/intl-datetimeformat/locale-data/cs.js");
  },
  sk: () => {
    require("@formatjs/intl-displaynames/locale-data/sk.js");
    require("@formatjs/intl-listformat/locale-data/sk.js");
    require("@formatjs/intl-pluralrules/locale-data/sk.js");
    require("@formatjs/intl-numberformat/locale-data/sk.js");
    require("@formatjs/intl-relativetimeformat/locale-data/sk.js");
    require("@formatjs/intl-datetimeformat/locale-data/sk.js");
  },
  hu: () => {
    require("@formatjs/intl-displaynames/locale-data/hu.js");
    require("@formatjs/intl-listformat/locale-data/hu.js");
    require("@formatjs/intl-pluralrules/locale-data/hu.js");
    require("@formatjs/intl-numberformat/locale-data/hu.js");
    require("@formatjs/intl-relativetimeformat/locale-data/hu.js");
    require("@formatjs/intl-datetimeformat/locale-data/hu.js");
  },
  ro: () => {
    require("@formatjs/intl-displaynames/locale-data/ro.js");
    require("@formatjs/intl-listformat/locale-data/ro.js");
    require("@formatjs/intl-pluralrules/locale-data/ro.js");
    require("@formatjs/intl-numberformat/locale-data/ro.js");
    require("@formatjs/intl-relativetimeformat/locale-data/ro.js");
    require("@formatjs/intl-datetimeformat/locale-data/ro.js");
  },
  bg: () => {
    require("@formatjs/intl-displaynames/locale-data/bg.js");
    require("@formatjs/intl-listformat/locale-data/bg.js");
    require("@formatjs/intl-pluralrules/locale-data/bg.js");
    require("@formatjs/intl-numberformat/locale-data/bg.js");
    require("@formatjs/intl-relativetimeformat/locale-data/bg.js");
    require("@formatjs/intl-datetimeformat/locale-data/bg.js");
  },
  el: () => {
    require("@formatjs/intl-displaynames/locale-data/el.js");
    require("@formatjs/intl-listformat/locale-data/el.js");
    require("@formatjs/intl-pluralrules/locale-data/el.js");
    require("@formatjs/intl-numberformat/locale-data/el.js");
    require("@formatjs/intl-relativetimeformat/locale-data/el.js");
    require("@formatjs/intl-datetimeformat/locale-data/el.js");
  },
  sv: () => {
    require("@formatjs/intl-displaynames/locale-data/sv.js");
    require("@formatjs/intl-listformat/locale-data/sv.js");
    require("@formatjs/intl-pluralrules/locale-data/sv.js");
    require("@formatjs/intl-numberformat/locale-data/sv.js");
    require("@formatjs/intl-relativetimeformat/locale-data/sv.js");
    require("@formatjs/intl-datetimeformat/locale-data/sv.js");
  },
  da: () => {
    require("@formatjs/intl-displaynames/locale-data/da.js");
    require("@formatjs/intl-listformat/locale-data/da.js");
    require("@formatjs/intl-pluralrules/locale-data/da.js");
    require("@formatjs/intl-numberformat/locale-data/da.js");
    require("@formatjs/intl-relativetimeformat/locale-data/da.js");
    require("@formatjs/intl-datetimeformat/locale-data/da.js");
  },
  nb: () => {
    require("@formatjs/intl-displaynames/locale-data/nb.js");
    require("@formatjs/intl-listformat/locale-data/nb.js");
    require("@formatjs/intl-pluralrules/locale-data/nb.js");
    require("@formatjs/intl-numberformat/locale-data/nb.js");
    require("@formatjs/intl-relativetimeformat/locale-data/nb.js");
    require("@formatjs/intl-datetimeformat/locale-data/nb.js");
  },
  fi: () => {
    require("@formatjs/intl-displaynames/locale-data/fi.js");
    require("@formatjs/intl-listformat/locale-data/fi.js");
    require("@formatjs/intl-pluralrules/locale-data/fi.js");
    require("@formatjs/intl-numberformat/locale-data/fi.js");
    require("@formatjs/intl-relativetimeformat/locale-data/fi.js");
    require("@formatjs/intl-datetimeformat/locale-data/fi.js");
  },
  hr: () => {
    require("@formatjs/intl-displaynames/locale-data/hr.js");
    require("@formatjs/intl-listformat/locale-data/hr.js");
    require("@formatjs/intl-pluralrules/locale-data/hr.js");
    require("@formatjs/intl-numberformat/locale-data/hr.js");
    require("@formatjs/intl-relativetimeformat/locale-data/hr.js");
    require("@formatjs/intl-datetimeformat/locale-data/hr.js");
  },
  sr: () => {
    require("@formatjs/intl-displaynames/locale-data/sr.js");
    require("@formatjs/intl-listformat/locale-data/sr.js");
    require("@formatjs/intl-pluralrules/locale-data/sr.js");
    require("@formatjs/intl-numberformat/locale-data/sr.js");
    require("@formatjs/intl-relativetimeformat/locale-data/sr.js");
    require("@formatjs/intl-datetimeformat/locale-data/sr.js");
  },
  sl: () => {
    require("@formatjs/intl-displaynames/locale-data/sl.js");
    require("@formatjs/intl-listformat/locale-data/sl.js");
    require("@formatjs/intl-pluralrules/locale-data/sl.js");
    require("@formatjs/intl-numberformat/locale-data/sl.js");
    require("@formatjs/intl-relativetimeformat/locale-data/sl.js");
    require("@formatjs/intl-datetimeformat/locale-data/sl.js");
  },
  lt: () => {
    require("@formatjs/intl-displaynames/locale-data/lt.js");
    require("@formatjs/intl-listformat/locale-data/lt.js");
    require("@formatjs/intl-pluralrules/locale-data/lt.js");
    require("@formatjs/intl-numberformat/locale-data/lt.js");
    require("@formatjs/intl-relativetimeformat/locale-data/lt.js");
    require("@formatjs/intl-datetimeformat/locale-data/lt.js");
  },
  lv: () => {
    require("@formatjs/intl-displaynames/locale-data/lv.js");
    require("@formatjs/intl-listformat/locale-data/lv.js");
    require("@formatjs/intl-pluralrules/locale-data/lv.js");
    require("@formatjs/intl-numberformat/locale-data/lv.js");
    require("@formatjs/intl-relativetimeformat/locale-data/lv.js");
    require("@formatjs/intl-datetimeformat/locale-data/lv.js");
  },
  et: () => {
    require("@formatjs/intl-displaynames/locale-data/et.js");
    require("@formatjs/intl-listformat/locale-data/et.js");
    require("@formatjs/intl-pluralrules/locale-data/et.js");
    require("@formatjs/intl-numberformat/locale-data/et.js");
    require("@formatjs/intl-relativetimeformat/locale-data/et.js");
    require("@formatjs/intl-datetimeformat/locale-data/et.js");
  },
  bn: () => {
    require("@formatjs/intl-displaynames/locale-data/bn.js");
    require("@formatjs/intl-listformat/locale-data/bn.js");
    require("@formatjs/intl-pluralrules/locale-data/bn.js");
    require("@formatjs/intl-numberformat/locale-data/bn.js");
    require("@formatjs/intl-relativetimeformat/locale-data/bn.js");
    require("@formatjs/intl-datetimeformat/locale-data/bn.js");
  },
  ms: () => {
    require("@formatjs/intl-displaynames/locale-data/ms.js");
    require("@formatjs/intl-listformat/locale-data/ms.js");
    require("@formatjs/intl-pluralrules/locale-data/ms.js");
    require("@formatjs/intl-numberformat/locale-data/ms.js");
    require("@formatjs/intl-relativetimeformat/locale-data/ms.js");
    require("@formatjs/intl-datetimeformat/locale-data/ms.js");
  },
  fil: () => {
    require("@formatjs/intl-displaynames/locale-data/fil.js");
    require("@formatjs/intl-listformat/locale-data/fil.js");
    require("@formatjs/intl-pluralrules/locale-data/fil.js");
    require("@formatjs/intl-numberformat/locale-data/fil.js");
    require("@formatjs/intl-relativetimeformat/locale-data/fil.js");
    require("@formatjs/intl-datetimeformat/locale-data/fil.js");
  },
  "zh-Hant": () => {
    require("@formatjs/intl-displaynames/locale-data/zh-Hant.js");
    require("@formatjs/intl-listformat/locale-data/zh-Hant.js");
    require("@formatjs/intl-numberformat/locale-data/zh-Hant.js");
    require("@formatjs/intl-relativetimeformat/locale-data/zh-Hant.js");
    require("@formatjs/intl-datetimeformat/locale-data/zh-Hant.js");
  },
  ar: () => {
    require("@formatjs/intl-displaynames/locale-data/ar.js");
    require("@formatjs/intl-listformat/locale-data/ar.js");
    require("@formatjs/intl-pluralrules/locale-data/ar.js");
    require("@formatjs/intl-numberformat/locale-data/ar.js");
    require("@formatjs/intl-relativetimeformat/locale-data/ar.js");
    require("@formatjs/intl-datetimeformat/locale-data/ar.js");
  },
  he: () => {
    require("@formatjs/intl-displaynames/locale-data/he.js");
    require("@formatjs/intl-listformat/locale-data/he.js");
    require("@formatjs/intl-pluralrules/locale-data/he.js");
    require("@formatjs/intl-numberformat/locale-data/he.js");
    require("@formatjs/intl-relativetimeformat/locale-data/he.js");
    require("@formatjs/intl-datetimeformat/locale-data/he.js");
  },
  fa: () => {
    require("@formatjs/intl-displaynames/locale-data/fa.js");
    require("@formatjs/intl-listformat/locale-data/fa.js");
    require("@formatjs/intl-pluralrules/locale-data/fa.js");
    require("@formatjs/intl-numberformat/locale-data/fa.js");
    require("@formatjs/intl-relativetimeformat/locale-data/fa.js");
    require("@formatjs/intl-datetimeformat/locale-data/fa.js");
  },
  ur: () => {
    require("@formatjs/intl-displaynames/locale-data/ur.js");
    require("@formatjs/intl-listformat/locale-data/ur.js");
    require("@formatjs/intl-pluralrules/locale-data/ur.js");
    require("@formatjs/intl-numberformat/locale-data/ur.js");
    require("@formatjs/intl-relativetimeformat/locale-data/ur.js");
    require("@formatjs/intl-datetimeformat/locale-data/ur.js");
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
    ["getcanonicallocales", () => require("@formatjs/intl-getcanonicallocales/polyfill.js")],
    ["locale", () => require("@formatjs/intl-locale/polyfill.js")],
    // Forced: a native DisplayNames without ICU display-name data returns the locale code
    // unchanged, which GT reads as invalid.
    ["displaynames", () => require("@formatjs/intl-displaynames/polyfill-force.js")],
    ["listformat", () => require("@formatjs/intl-listformat/polyfill.js")],
    // Forced: Hermes reports support but returns wrong plural categories
    // (formatjs/formatjs#4463), which GT relies on for message selection.
    ["pluralrules", () => require("@formatjs/intl-pluralrules/polyfill-force.js")],
    ["numberformat", () => require("@formatjs/intl-numberformat/polyfill.js")],
    ["relativetimeformat", () => require("@formatjs/intl-relativetimeformat/polyfill.js")],
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
        const { shouldPolyfill } = require("@formatjs/intl-datetimeformat/should-polyfill.js");
        if (!shouldPolyfill()) return;

        require("@formatjs/intl-datetimeformat/polyfill.js");
        require("@formatjs/intl-datetimeformat/add-all-tz.js");
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
