const path = require("node:path");

const {
  APPLE_LOCALES,
  loadListing,
  renderAppleDescription,
  checkLimits,
} = require("./store/listings");

// App Review credentials are secrets and must never be committed. They are read from
// .env.store.local, which is covered by the `.env*.local` rule in .gitignore.
try {
  process.loadEnvFile(path.join(__dirname, ".env.store.local"));
} catch {
  // File is optional - the variables may already be set in the environment or CI.
}

/**
 * One App Store localization per app locale that App Store Connect supports.
 * The copy comes from `store/listings/<appLocale>.json`, the same files that
 * `store/build-store-metadata.js` renders into the Google Play metadata tree.
 * Locales Apple does not offer (bg, sr, sl, lt, lv, et, bn, fil, fa, ur) fall
 * back to en-US in the App Store; on Google Play they are all listed.
 */
function appleInfo() {
  const info = {};
  const problems = [];

  for (const [appLocale, appleLocale] of Object.entries(APPLE_LOCALES)) {
    const listing = loadListing(appLocale);
    problems.push(...checkLimits(appLocale, listing));

    info[appleLocale] = {
      title: listing.appleName,
      subtitle: listing.subtitle,
      promoText: listing.promoText,
      description: renderAppleDescription(listing),
      keywords: listing.keywords,
      marketingUrl: "https://wishlane.net",
      supportUrl: "https://wishlane.net",
      privacyPolicyUrl: "https://wishlane.net/privacy-policy",
    };
  }

  // Fail before upload rather than halfway through it - App Store Connect rejects
  // the whole push if a single localization is over a character limit.
  if (problems.length > 0) {
    throw new Error(`Store listing limits exceeded:\n  ${problems.join("\n  ")}`);
  }

  return info;
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.store.local.example to .env.store.local and fill it in.`,
    );
  }
  return value;
}

module.exports = {
  configVersion: 0,
  apple: {
    version: "1.0",
    copyright: "2026 BerryNora",
    release: {
      automaticRelease: false,
      phasedRelease: true,
    },
    categories: ["LIFESTYLE", "SHOPPING"],
    review: {
      firstName: "Valerii",
      lastName: "Inshyn",
      email: "support@wishlane.net",
      phone: required("APPLE_REVIEW_PHONE"),
      demoRequired: true,
      demoUsername: required("APPLE_DEMO_USERNAME"),
      demoPassword: required("APPLE_DEMO_PASSWORD"),
      notes:
        'Wishlane is a wishlist and gifting app. Sign in with the demo account above using the "Continue with email" option on the sign-in screen.\n\nSuggested review flow:\n1. Sign in with the demo credentials.\n2. Wishlists tab - open the seeded wishlist, tap + to add an item, paste any product URL (e.g. an Amazon link). The title, image and price are filled in automatically by our scraping service.\n3. Friends tab - the demo account already has a friend. Open their wishlist and tap Reserve on an item. The reservation is hidden from the list owner.\n4. Secret Santa tab - a seeded group shows the draw result and the matched person\'s wishlist.\n5. Profile > Subscription - opens the Wishlane Premium paywall (auto-renewing monthly and yearly subscriptions via RevenueCat).\n6. Profile > Settings > Account - in-app account deletion is available here.\n\nSign in with Apple is supported and is offered alongside the other third-party sign-in options.\n\nThe app requires network access; there is no offline mode.',
    },
    advisory: {
      ageRatingOverride: "NONE",
      alcoholTobaccoOrDrugUseOrReferences: "NONE",
      contests: "NONE",
      gambling: false,
      gamblingSimulated: "NONE",
      horrorOrFearThemes: "NONE",
      kidsAgeBand: null,
      koreaAgeRatingOverride: "NONE",
      lootBox: false,
      matureOrSuggestiveThemes: "NONE",
      medicalOrTreatmentInformation: "NONE",
      profanityOrCrudeHumor: "NONE",
      sexualContentGraphicAndNudity: "NONE",
      sexualContentOrNudity: "NONE",
      unrestrictedWebAccess: false,
      violenceCartoonOrFantasy: "NONE",
      violenceRealistic: "NONE",
      violenceRealisticProlongedGraphicOrSadistic: "NONE",
      advertising: false,
      ageAssurance: false,
      ageRatingOverrideV2: "NONE",
      developerAgeRatingInfoUrl: null,
      gunsOrOtherWeapons: "NONE",
      healthOrWellnessTopics: false,
      messagingAndChat: false,
      parentalControls: false,
      userGeneratedContent: true,
    },
    info: appleInfo(),
  },
};
