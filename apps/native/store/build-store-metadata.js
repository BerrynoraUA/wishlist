/**
 * Regenerates every localized store artefact from `store/listings/*.json`.
 *
 *   node store/build-store-metadata.js          # write files
 *   node store/build-store-metadata.js --check  # fail if anything is stale or over a limit
 *
 * Outputs (all committed, none hand-edited):
 *   fastlane/metadata/android/<playLocale>/…  — what `fastlane supply` uploads to Play
 *   store/ios-locales/<iosLocale>.json        — Info.plist strings referenced by app.json
 *
 * The Apple listing is not written to disk: `store.config.js` reads the same
 * listing files directly, because `eas metadata:push` loads that config at run time.
 */

const fs = require("node:fs");
const path = require("node:path");

const {
  APP_LOCALES,
  PLAY_LOCALES,
  IOS_LOCALES,
  loadListing,
  renderPlayDescription,
  renderChangelog,
  checkLimits,
} = require("./listings");

const NATIVE_ROOT = path.join(__dirname, "..");
const PLAY_DIR = path.join(NATIVE_ROOT, "fastlane", "metadata", "android");
const IOS_LOCALES_DIR = path.join(__dirname, "ios-locales");

const checkOnly = process.argv.includes("--check");
const stale = [];
const problems = [];

function writeFile(file, contents) {
  // Compare with line endings normalised: a Windows checkout may hold CRLF even though
  // .gitattributes asks for LF, and that alone is not a reason to call a file stale.
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
  if (current === contents) return;
  if (checkOnly) {
    stale.push(path.relative(NATIVE_ROOT, file));
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf8");
}

for (const appLocale of APP_LOCALES) {
  const listing = loadListing(appLocale);
  problems.push(...checkLimits(appLocale, listing));

  const playDir = path.join(PLAY_DIR, PLAY_LOCALES[appLocale]);
  writeFile(path.join(playDir, "title.txt"), `${listing.title}\n`);
  writeFile(path.join(playDir, "short_description.txt"), `${listing.shortDescription}\n`);
  writeFile(path.join(playDir, "full_description.txt"), `${renderPlayDescription(listing)}\n`);
  writeFile(path.join(playDir, "changelogs", "default.txt"), `${renderChangelog(listing)}\n`);

  const nativeStrings = {
    ios: {
      CFBundleDisplayName: listing.appleName,
      NSPhotoLibraryUsageDescription: listing.permissions.photos,
      NSFaceIDUsageDescription: listing.permissions.faceId,
    },
    android: {
      app_name: listing.appleName,
    },
  };
  writeFile(
    path.join(IOS_LOCALES_DIR, `${IOS_LOCALES[appLocale]}.json`),
    `${JSON.stringify(nativeStrings, null, 2)}\n`,
  );
}

if (problems.length > 0) {
  console.error("Store listing limits exceeded:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

if (stale.length > 0) {
  console.error(
    "Generated store metadata is out of date. Run `node store/build-store-metadata.js`:",
  );
  for (const file of stale) console.error(`  ${file}`);
  process.exit(1);
}

console.log(
  checkOnly
    ? `Store metadata is up to date (${APP_LOCALES.length} locales).`
    : `Wrote store metadata for ${APP_LOCALES.length} locales.`,
);
