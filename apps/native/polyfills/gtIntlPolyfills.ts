/**
 * FormatJS / Intl polyfills required by General Translation (`isValidLocale`, etc.).
 * The `gt-react-native` Babel plugin injects these into `expo-router/entry`, but that
 * file often is not transformed for Metro, so we load polyfills here before any GT import.
 * Keep language-level locale data in sync with GT locales (`en`/`uk`/`de`/`es`/`fr`/`ja`/`it`/`pt`/`zh`/`pl`/`ko`/`nl` cover `en-US`/`uk`/`de`/`es`/`fr`/`ja`/`it`/`pt`/`zh`/`pl`/`ko`/`nl`).
 */
import "@formatjs/intl-getcanonicallocales/polyfill";
import "@formatjs/intl-locale/polyfill";
import "@formatjs/intl-displaynames/polyfill-force";
import "@formatjs/intl-displaynames/locale-data/en";
import "@formatjs/intl-displaynames/locale-data/uk";
import "@formatjs/intl-displaynames/locale-data/de";
import "@formatjs/intl-displaynames/locale-data/es";
import "@formatjs/intl-displaynames/locale-data/fr";
import "@formatjs/intl-displaynames/locale-data/ja";
import "@formatjs/intl-displaynames/locale-data/it";
import "@formatjs/intl-displaynames/locale-data/pt";
import "@formatjs/intl-displaynames/locale-data/zh";
import "@formatjs/intl-displaynames/locale-data/pl";
import "@formatjs/intl-displaynames/locale-data/ko";
import "@formatjs/intl-displaynames/locale-data/nl";
import "@formatjs/intl-pluralrules/polyfill-force";
import "@formatjs/intl-numberformat/polyfill";
import "@formatjs/intl-datetimeformat/polyfill";
import "@formatjs/intl-datetimeformat/add-all-tz";

// Add locale data for each language:
import "@formatjs/intl-pluralrules/locale-data/en";
import "@formatjs/intl-pluralrules/locale-data/uk";
import "@formatjs/intl-pluralrules/locale-data/de";
import "@formatjs/intl-pluralrules/locale-data/es";
import "@formatjs/intl-pluralrules/locale-data/fr";
import "@formatjs/intl-pluralrules/locale-data/ja";
import "@formatjs/intl-pluralrules/locale-data/it";
import "@formatjs/intl-pluralrules/locale-data/pt";
import "@formatjs/intl-pluralrules/locale-data/zh";
import "@formatjs/intl-pluralrules/locale-data/pl";
import "@formatjs/intl-pluralrules/locale-data/ko";
import "@formatjs/intl-pluralrules/locale-data/nl";
import "@formatjs/intl-numberformat/locale-data/en";
import "@formatjs/intl-numberformat/locale-data/uk";
import "@formatjs/intl-numberformat/locale-data/de";
import "@formatjs/intl-numberformat/locale-data/es";
import "@formatjs/intl-numberformat/locale-data/fr";
import "@formatjs/intl-numberformat/locale-data/ja";
import "@formatjs/intl-numberformat/locale-data/it";
import "@formatjs/intl-numberformat/locale-data/pt";
import "@formatjs/intl-numberformat/locale-data/zh";
import "@formatjs/intl-numberformat/locale-data/pl";
import "@formatjs/intl-numberformat/locale-data/ko";
import "@formatjs/intl-numberformat/locale-data/nl";
// ... repeat for each locale and polyfill
