/**
 * expo-dev-menu registers `showsAtLaunch: true` and `isOnboardingFinished: false` as
 * its iOS defaults, so a freshly installed dev client opens the dev menu over the app
 * the moment the first screen appears — which is the moment a capture starts. These
 * Info.plist keys are the values it registers instead (`DevMenuPreferences.setup`
 * reads each one with `Bundle.main.object(forInfoDictionaryKey:)`), and they are the
 * only lever that reaches it: the app reads its preferences from inside its own
 * sandboxed container, so `xcrun simctl spawn … defaults write` lands in the
 * simulator's own defaults and never arrives. The capture runner gets the same result
 * on Android by writing the dev-menu shared_prefs file through `run-as`.
 */
const SHOWCASE_DEV_MENU_INFO_PLIST = {
  EXDevMenuShowsAtLaunch: false,
  EXDevMenuIsOnboardingFinished: true,
  EXDevMenuShowFloatingActionButton: false,
};

/**
 * app.json stays the whole configuration. This adds the keys above and nothing else,
 * and only to a showcase build — every other build, development or EAS or store, gets
 * the static config untouched.
 */
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_SHOWCASE !== "1") return config;
  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: { ...config.ios?.infoPlist, ...SHOWCASE_DEV_MENU_INFO_PLIST },
    },
  };
};
