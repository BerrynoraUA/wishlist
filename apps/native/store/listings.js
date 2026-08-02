/**
 * Single source of truth for localized store listings.
 *
 * Every locale the app itself ships (see `gt.config.json`) has a listing file in
 * `store/listings/<appLocale>.json`. Both stores are rendered from those files:
 *
 *   - Apple  — `store.config.js` builds `apple.info` and `eas metadata:push` uploads it.
 *   - Google — `store/build-store-metadata.js` writes `fastlane/metadata/android/<playLocale>/`.
 *
 * The two stores disagree on locale codes, on which locales exist at all, and on
 * how the billing paragraph must be worded, so the listing files stay
 * store-agnostic and the differences live in the renderers below.
 */

const fs = require("node:fs");
const path = require("node:path");

const LISTINGS_DIR = path.join(__dirname, "listings");

/** App locales, in the order they appear in `gt.config.json`. */
const APP_LOCALES = [
  "en",
  "uk",
  "de",
  "es",
  "fr",
  "ja",
  "it",
  "pt",
  "zh",
  "pl",
  "ko",
  "nl",
  "hi",
  "tr",
  "vi",
  "th",
  "id",
  "cs",
  "sk",
  "hu",
  "ro",
  "bg",
  "el",
  "sv",
  "da",
  "nb",
  "fi",
  "hr",
  "sr",
  "sl",
  "lt",
  "lv",
  "et",
  "bn",
  "ms",
  "fil",
  "zh-Hant",
  "ar",
  "he",
  "fa",
  "ur",
];

/**
 * App locale → App Store Connect locale. App Store Connect only accepts a fixed
 * list of localizations; locales missing from this map (bg, sr, sl, lt, lv, et,
 * bn, fil, fa, ur) simply have no App Store equivalent and fall back to en-US.
 */
const APPLE_LOCALES = {
  en: "en-US",
  uk: "uk",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  ja: "ja",
  it: "it",
  pt: "pt-BR", // the app's Portuguese is Brazilian
  zh: "zh-Hans",
  pl: "pl",
  ko: "ko",
  nl: "nl-NL",
  hi: "hi",
  tr: "tr",
  vi: "vi",
  th: "th",
  id: "id",
  cs: "cs",
  sk: "sk",
  hu: "hu",
  ro: "ro",
  el: "el",
  sv: "sv",
  da: "da",
  nb: "no",
  fi: "fi",
  hr: "hr",
  ms: "ms",
  "zh-Hant": "zh-Hant",
  ar: "ar-SA",
  he: "he",
};

/** App locale → Google Play listing language. Play covers all 41. */
const PLAY_LOCALES = {
  en: "en-US",
  uk: "uk",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  ja: "ja-JP",
  it: "it-IT",
  pt: "pt-BR",
  zh: "zh-CN",
  pl: "pl-PL",
  ko: "ko-KR",
  nl: "nl-NL",
  hi: "hi-IN",
  tr: "tr-TR",
  vi: "vi",
  th: "th",
  id: "id",
  cs: "cs-CZ",
  sk: "sk",
  hu: "hu-HU",
  ro: "ro",
  bg: "bg",
  el: "el-GR",
  sv: "sv-SE",
  da: "da-DK",
  nb: "no-NO",
  fi: "fi-FI",
  hr: "hr",
  sr: "sr",
  sl: "sl",
  lt: "lt",
  lv: "lv",
  et: "et",
  bn: "bn-BD",
  ms: "ms",
  fil: "fil",
  "zh-Hant": "zh-TW",
  ar: "ar",
  he: "iw-IL", // Play still uses the legacy ISO 639 code for Hebrew
  fa: "fa",
  ur: "ur",
};

/**
 * App locale → iOS `.lproj` name, used for the `expo.locales` Info.plist strings.
 * iOS is not limited to the App Store Connect list, so every locale is covered.
 */
const IOS_LOCALES = {
  en: "en",
  uk: "uk",
  de: "de",
  es: "es",
  fr: "fr",
  ja: "ja",
  it: "it",
  pt: "pt-BR",
  zh: "zh-Hans",
  pl: "pl",
  ko: "ko",
  nl: "nl",
  hi: "hi",
  tr: "tr",
  vi: "vi",
  th: "th",
  id: "id",
  cs: "cs",
  sk: "sk",
  hu: "hu",
  ro: "ro",
  bg: "bg",
  el: "el",
  sv: "sv",
  da: "da",
  nb: "nb",
  fi: "fi",
  hr: "hr",
  sr: "sr",
  sl: "sl",
  lt: "lt",
  lv: "lv",
  et: "et",
  bn: "bn",
  ms: "ms",
  fil: "fil",
  "zh-Hant": "zh-Hant",
  ar: "ar",
  he: "he",
  fa: "fa",
  ur: "ur",
};

/**
 * Wishlane Premium pricing, as it appears in the store listings.
 *
 * The in-app paywall does not use these - RevenueCat hands the SDK the localized,
 * currency-correct price from StoreKit/Play Billing at runtime. Store listings are
 * static text uploaded ahead of install, so Apple guideline 3.1.2 pricing has to be
 * written in by hand. Keeping the numbers here means a price change is a two-line
 * edit rather than 41 re-translated sentences.
 *
 * These must stay in step with the real product prices in App Store Connect and
 * Play Console; nothing verifies that automatically.
 */
const PRICES = {
  monthly: "$3.99",
  yearly: "$24.99",
};

/** Store-enforced character limits. Exceeding any of these is a hard upload error. */
const LIMITS = {
  appleTitle: 30,
  appleSubtitle: 30,
  applePromoText: 170,
  appleKeywords: 100,
  appleDescription: 4000,
  playTitle: 30,
  playShortDescription: 80,
  playFullDescription: 4000,
  playChangelog: 500,
};

function loadListing(appLocale) {
  const file = path.join(LISTINGS_DIR, `${appLocale}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadAllListings() {
  return Object.fromEntries(APP_LOCALES.map((locale) => [locale, loadListing(locale)]));
}

/** Fills the {monthly} and {yearly} placeholders in a listing's price sentence. */
function renderPrice(listing) {
  return listing.subscriptionPrice
    .replace("{monthly}", PRICES.monthly)
    .replace("{yearly}", PRICES.yearly);
}

function renderBody(listing, { heading, subscription }) {
  const blocks = [...listing.intro];
  for (const section of listing.sections) {
    blocks.push(`${heading(section.heading)}\n${section.body}`);
  }
  blocks.push(listing.closing);
  blocks.push(
    `${heading(listing.subscriptionHeading)}\n${subscription}\n\n${renderPrice(listing)}`,
  );
  blocks.push(listing.footer.join("\n"));
  return blocks.join("\n\n");
}

/** App Store descriptions are plain text; headings are set apart by upper-casing. */
function renderAppleDescription(listing) {
  return renderBody(listing, {
    heading: (text) => text.toLocaleUpperCase(listing.bcp47),
    subscription: listing.subscriptionApple,
  });
}

/** Play full descriptions accept a small HTML subset, so headings can be bold. */
function renderPlayDescription(listing) {
  return renderBody(listing, {
    heading: (text) => `<b>${text}</b>`,
    subscription: listing.subscriptionGoogle,
  });
}

function renderChangelog(listing) {
  return [listing.changelogIntro, "", ...listing.changelogBullets.map((b) => `- ${b}`)].join("\n");
}

/** Returns a list of human-readable limit violations; empty means the listing is safe to upload. */
function checkLimits(appLocale, listing) {
  const problems = [];
  const check = (field, value, limit) => {
    if (value.length > limit) {
      problems.push(`${appLocale}: ${field} is ${value.length} chars, limit is ${limit}`);
    }
  };

  check("play title", listing.title, LIMITS.playTitle);
  check("play shortDescription", listing.shortDescription, LIMITS.playShortDescription);
  check("play fullDescription", renderPlayDescription(listing), LIMITS.playFullDescription);
  check("play changelog", renderChangelog(listing), LIMITS.playChangelog);

  if (APPLE_LOCALES[appLocale]) {
    check("apple name", listing.appleName, LIMITS.appleTitle);
    check("apple subtitle", listing.subtitle, LIMITS.appleSubtitle);
    check("apple promoText", listing.promoText, LIMITS.applePromoText);
    check("apple keywords", listing.keywords.join(","), LIMITS.appleKeywords);
    check("apple description", renderAppleDescription(listing), LIMITS.appleDescription);
  }

  return problems;
}

module.exports = {
  APP_LOCALES,
  APPLE_LOCALES,
  PLAY_LOCALES,
  IOS_LOCALES,
  LIMITS,
  PRICES,
  loadListing,
  loadAllListings,
  renderPrice,
  renderAppleDescription,
  renderPlayDescription,
  renderChangelog,
  checkLimits,
};
