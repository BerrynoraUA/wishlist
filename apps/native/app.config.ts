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
      // Fingerprint (not appVersion) so an OTA only reaches binaries whose
      // native project — native deps, config plugins, AND patches/ — matches the
      // update. Under appVersion every build of a version shares one runtime
      // version, so a JS update could land on a binary missing the native
      // changes it needs and crash. MOBILE_VERSION_POLICY is the escape hatch
      // for a build that wants the looser policy on purpose, e.g. a dev client
      // that should accept every update; Expo validates the value it is given.
      policy: (process.env.MOBILE_VERSION_POLICY as RuntimeVersionPolicy) ?? "fingerprint",
    },
  };
};
