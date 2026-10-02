import type { ConfigContext, ExpoConfig } from "expo/config";

type RuntimeVersionPolicy = Extract<ExpoConfig["runtimeVersion"], { policy: unknown }>["policy"];

export default ({ config }: ConfigContext): ExpoConfig => {
  // ConfigContext types every static field as optional; app.json always sets
  // these two, and EAS cannot resolve the project without them.
  if (!config.name || !config.slug) {
    throw new Error("app.json must define expo.name and expo.slug.");
  }

  return {
    ...config,
    name: config.name,
    slug: config.slug,
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
        (process.env.MOBILE_VERSION_POLICY as RuntimeVersionPolicy) ??
        (process.env.APP_VARIANT === "development" ? "appVersion" : "fingerprint"),
    },
  };
};
