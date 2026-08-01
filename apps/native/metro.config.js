const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// The `gt-react-native` Babel plugin injects `@formatjs/<pkg>/locale-data/<locale>`
// for every locale in `gt.config.json` x every FormatJS package, but
// `@formatjs/intl-pluralrules` only ships language-level data — there is no
// `zh-Hant` file — so the generated import fails to resolve. Chinese has a single
// "other" plural category regardless of script, so `zh` is the correct data.
const LOCALE_DATA_ALIASES = {
  "@formatjs/intl-pluralrules/locale-data/zh-Hant":
    "@formatjs/intl-pluralrules/locale-data/zh",
};

const baseResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = baseResolveRequest ?? context.resolveRequest;
  return resolve(context, LOCALE_DATA_ALIASES[moduleName] ?? moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file (from previous step)
  cssEntryFile: "./global.css",
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: "./uniwind-types.d.ts",
  extraThemes: [
    "blue-light",
    "blue-dark",
    "peach-light",
    "peach-dark",
    "mint-light",
    "mint-dark",
    "lavender-light",
    "lavender-dark",
  ],
});
