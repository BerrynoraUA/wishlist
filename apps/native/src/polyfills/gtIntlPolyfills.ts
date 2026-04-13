/**
 * FormatJS / Intl polyfills required by General Translation (`isValidLocale`, etc.).
 * The `gt-react-native` Babel plugin injects these into `expo-router/entry`, but that
 * file often is not transformed for Metro, so we load polyfills here before any GT import.
 * Keep language-level locale data in sync with GT locales (`en`/`uk` cover `en-US`/`uk`).
 */
import "@formatjs/intl-getcanonicallocales/polyfill";
import "@formatjs/intl-locale/polyfill";
import "@formatjs/intl-displaynames/polyfill-force";
import "@formatjs/intl-displaynames/locale-data/en";
import "@formatjs/intl-displaynames/locale-data/uk";
import "@formatjs/intl-pluralrules/polyfill-force";
import "@formatjs/intl-numberformat/polyfill";
import "@formatjs/intl-datetimeformat/polyfill";
import "@formatjs/intl-datetimeformat/add-all-tz";

// Add locale data for each language:
import "@formatjs/intl-pluralrules/locale-data/en";
import "@formatjs/intl-pluralrules/locale-data/uk";
import "@formatjs/intl-numberformat/locale-data/en";
import "@formatjs/intl-numberformat/locale-data/uk";
// ... repeat for each locale and polyfill
