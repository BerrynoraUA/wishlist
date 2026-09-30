import { afterEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ bottom: 24 }));

vi.mock("expo-glass-effect", () => ({ isLiquidGlassAvailable: () => false }));
vi.mock("react-native", () => ({
  I18nManager: { isRTL: false },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: fixture.bottom, left: 0 }),
}));

afterEach(() => {
  fixture.bottom = 24;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("create button arrow target", () => {
  it("targets the raised Android button above the tab bar", async () => {
    vi.stubEnv("EXPO_OS", "android");
    const { useCreateButtonCenter } = await import("./create-button-box");
    expect(useCreateButtonCenter()).toEqual({ x: 200, y: 728, radius: 26 });

    fixture.bottom = 0;
    expect(useCreateButtonCenter()).toEqual({ x: 200, y: 744, radius: 26 });
  });

  it("keeps the classic iOS button position", async () => {
    vi.stubEnv("EXPO_OS", "ios");
    const { useCreateButtonCenter } = await import("./create-button-box");
    expect(useCreateButtonCenter()).toEqual({ x: 200, y: 745, radius: 26 });
  });
});
