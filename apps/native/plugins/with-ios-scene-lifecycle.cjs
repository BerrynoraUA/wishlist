const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const appDelegateClass = "class AppDelegate: ExpoAppDelegate {";
const sceneAppDelegateClass =
  "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {";
const appDelegateStartup = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

`;

module.exports = function withIosSceneLifecycle(config) {
  config = withAppDelegate(config, (config) => {
    const { contents } = config.modResults;
    if (contents.includes(sceneAppDelegateClass)) return config;

    if (!contents.includes(appDelegateClass) || !contents.includes(appDelegateStartup)) {
      throw new Error("The Expo AppDelegate template changed. Review iOS scene startup.");
    }

    config.modResults.contents = contents
      .replace(appDelegateClass, sceneAppDelegateClass)
      .replace(appDelegateStartup, "");
    return config;
  });

  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "EXExpoAppSceneDelegate",
          },
        ],
      },
    };
    return config;
  });
};
