import { type ConfigPlugin, withAppDelegate, withInfoPlist } from "expo/config-plugins.js";

/**
 * iOS 27 traps at launch (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`)
 * in any app built against its SDK that has not adopted the scene life cycle. Expo ships
 * `ExpoAppSceneDelegate` for this, but its SDK 57 prebuild template still starts React
 * Native from the app delegate, so this plugin makes the two changes the scene delegate
 * needs: declare it in the Info.plist, and let it own the window and the React Native
 * start. Deep links and user activities still reach `AppDelegate`'s overrides, because
 * the scene delegate forwards them there.
 */
const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: "Default Configuration",
        // The Objective-C name `ExpoAppSceneDelegate` is exported under.
        UISceneDelegateClassName: "EXExpoAppSceneDelegate",
      },
    ],
  },
};

const CLASS_DECLARATION = "class AppDelegate: ExpoAppDelegate {";
const ADOPTED_CLASS_DECLARATION =
  "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {";

const APP_DELEGATE_START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/u;

function adoptSceneLifecycle(appDelegate: string): string {
  if (appDelegate.includes(ADOPTED_CLASS_DECLARATION)) return appDelegate;
  // Fail the prebuild rather than ship a delegate that starts React Native twice or
  // never: a template change needs this plugin revisited.
  if (!appDelegate.includes(CLASS_DECLARATION) || !APP_DELEGATE_START.test(appDelegate)) {
    throw new Error(
      "with-ios-scene-lifecycle: AppDelegate.swift no longer matches the Expo SDK 57 template.",
    );
  }
  return appDelegate
    .replace(CLASS_DECLARATION, ADOPTED_CLASS_DECLARATION)
    .replace(APP_DELEGATE_START, "");
}

export const withIosSceneLifecycle: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (plistConfig) => {
    plistConfig.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return plistConfig;
  });
  return withAppDelegate(config, (delegateConfig) => {
    if (delegateConfig.modResults.language !== "swift") {
      throw new Error("with-ios-scene-lifecycle: expected a Swift AppDelegate.");
    }
    delegateConfig.modResults.contents = adoptSceneLifecycle(delegateConfig.modResults.contents);
    return delegateConfig;
  });
};
