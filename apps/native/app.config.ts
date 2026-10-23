import type { ConfigContext, ExpoConfig } from "expo/config";

type RuntimeVersionPolicy = Extract<ExpoConfig["runtimeVersion"], { policy: unknown }>["policy"];

export type AppVariant = "development" | "staging" | "production";

// Staging shares the production bundle ID, so both ship through the same App
// Store Connect app; only development installs alongside them. Android keeps one
// package for every variant because google-services.json registers only that one.
const VARIANTS = {
  development: { name: "Wishlane Dev", scheme: "wishlane-dev", iosSuffix: ".dev" },
  staging: { name: "Wishlane Staging", scheme: "wishlane-staging", iosSuffix: "" },
  production: null,
} as const satisfies Record<AppVariant, { name: string; scheme: string; iosSuffix: string } | null>;

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

export function resolveAppVariant(value: string | undefined): AppVariant {
  const variant = value?.trim() || "production";
  if (variant in VARIANTS) return variant as AppVariant;
  throw new Error(`Unsupported APP_VARIANT '${value}'. Use development, staging, or production.`);
}

export function resolveAppConfig(
  config: Partial<ExpoConfig>,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ExpoConfig {
  // ConfigContext types every static field as optional; app.json always sets
  // these two, and EAS cannot resolve the project without them.
  if (!config.name || !config.slug) {
    throw new Error("app.json must define expo.name and expo.slug.");
  }

  const appVariant = resolveAppVariant(env.APP_VARIANT);
  const variant = VARIANTS[appVariant];

  return {
    ...config,
    name: variant?.name ?? config.name,
    slug: config.slug,
    scheme: variant?.scheme ?? config.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios?.bundleIdentifier}${variant?.iosSuffix ?? ""}`,
      infoPlist: {
        ...config.ios?.infoPlist,
        // app.json's display name is the production TestFlight name.
        ...(variant && { CFBundleDisplayName: variant.name }),
        // Only a showcase build gets these; every other build keeps the defaults.
        ...(env.EXPO_PUBLIC_SHOWCASE === "1" && SHOWCASE_DEV_MENU_INFO_PLIST),
      },
    },
    runtimeVersion: {
      // Development manifests resolve on every launch, so the development
      // profile (APP_VARIANT=development in eas.json) skips fingerprint's
      // expensive native-project calculation and uses appVersion. Every other
      // build stays on fingerprint (not appVersion) so an OTA only reaches
      // binaries whose native project — native deps, config plugins, AND
      // patches/ — matches the update. Under appVersion every build of a version
      // shares one runtime version, so a JS update could land on a binary
      // missing the native changes it needs and crash. MOBILE_VERSION_POLICY
      // overrides both; Expo validates the value it is given.
      policy:
        (env.MOBILE_VERSION_POLICY as RuntimeVersionPolicy) ??
        (appVariant === "development" ? "appVersion" : "fingerprint"),
    },
  };
}

export default ({ config }: ConfigContext): ExpoConfig => resolveAppConfig(config);
