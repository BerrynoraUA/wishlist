// `gt-react-native/plugin` is deliberately not used. Its only job is to inject
// FormatJS polyfills plus locale data for every configured locale into
// `expo-router/entry` (~10.6 MB of startup JavaScript, and it injects
// `@formatjs/intl-pluralrules/locale-data/zh-Hant`, which does not exist).
// `polyfills/gtIntlPolyfills.ts` installs the same polyfills on demand instead.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
