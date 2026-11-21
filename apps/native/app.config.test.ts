import { describe, expect, it } from "vitest";
import type { ExpoConfig } from "expo/config";

import appJson from "./app.json";
import { resolveAppConfig, resolveAppVariant } from "./app.config";

const baseConfig = appJson.expo as ExpoConfig;
const bundleId = baseConfig.ios?.bundleIdentifier;

describe("app config", () => {
  it.each([
    ["development", "Wishlane Dev", "wishlane-dev", `${bundleId}.dev`, "Wishlane Dev"],
    ["staging", "Wishlane Staging", "wishlane-staging", bundleId, "Wishlane Staging"],
    ["production", baseConfig.name, baseConfig.scheme, bundleId, "wishlane tester"],
  ])("resolves the %s identity", (variant, name, scheme, iosId, displayName) => {
    const config = resolveAppConfig(baseConfig, { APP_VARIANT: variant });

    expect(config.name).toBe(name);
    expect(config.scheme).toBe(scheme);
    expect(config.ios?.bundleIdentifier).toBe(iosId);
    expect(config.ios?.infoPlist?.CFBundleDisplayName).toBe(displayName);
    expect(config.android?.package).toBe(baseConfig.android?.package);
  });

  it("defaults to production and rejects unknown variants", () => {
    expect(resolveAppVariant(undefined)).toBe("production");
    expect(resolveAppVariant(" ")).toBe("production");
    expect(() => resolveAppVariant("nightly")).toThrow(/Unsupported APP_VARIANT/);
  });

  it("keeps the rest of the iOS config", () => {
    const { ios } = resolveAppConfig(baseConfig, { APP_VARIANT: "development" });

    expect(ios?.appleTeamId).toBe(baseConfig.ios?.appleTeamId);
    expect(ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it("uses appVersion only for development unless overridden", () => {
    const policy = (env: Record<string, string>) =>
      resolveAppConfig(baseConfig, env).runtimeVersion;

    expect(policy({ APP_VARIANT: "development" })).toEqual({ policy: "appVersion" });
    expect(policy({ APP_VARIANT: "staging" })).toEqual({ policy: "fingerprint" });
    expect(policy({ APP_VARIANT: "development", MOBILE_VERSION_POLICY: "fingerprint" })).toEqual({
      policy: "fingerprint",
    });
  });

  it("hides the dev menu only in showcase builds", () => {
    const plist = (env: Record<string, string>) => resolveAppConfig(baseConfig, env).ios?.infoPlist;

    expect(plist({ EXPO_PUBLIC_SHOWCASE: "1" })?.EXDevMenuShowsAtLaunch).toBe(false);
    expect(plist({})).not.toHaveProperty("EXDevMenuShowsAtLaunch");
  });
});
