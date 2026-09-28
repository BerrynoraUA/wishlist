import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setColorScheme: vi.fn(),
  setUniwindTheme: vi.fn(),
  colorScheme: "light",
  uniwind: { currentTheme: "light", hasAdaptiveThemes: true },
}));

vi.mock("expo-router/react-navigation", () => ({
  DarkTheme: { colors: {} },
  DefaultTheme: { colors: {} },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("react-native", () => ({
  Appearance: {
    getColorScheme: () => mocks.colorScheme,
    setColorScheme: mocks.setColorScheme,
  },
}));

vi.mock("uniwind", () => ({
  Uniwind: {
    get currentTheme() {
      return mocks.uniwind.currentTheme;
    },
    get hasAdaptiveThemes() {
      return mocks.uniwind.hasAdaptiveThemes;
    },
    setTheme: mocks.setUniwindTheme,
  },
  useCSSVariable: vi.fn(),
}));

import { applyNativeThemeSettings } from "./theme";

describe("applyNativeThemeSettings", () => {
  beforeEach(() => {
    mocks.setUniwindTheme.mockClear();
    mocks.setColorScheme.mockClear();
    mocks.uniwind.currentTheme = "light";
    mocks.uniwind.hasAdaptiveThemes = true;
    mocks.colorScheme = "light";
    mocks.setColorScheme.mockImplementation((scheme: string) => {
      mocks.colorScheme = scheme;
    });
    mocks.setUniwindTheme.mockImplementation((theme: string) => {
      mocks.uniwind.hasAdaptiveThemes = theme === "system";
      mocks.uniwind.currentTheme = theme === "system" ? "light" : theme;
      // Custom themes restore the light OS appearance before the app forces dark.
      mocks.colorScheme = theme === "dark" ? "dark" : "light";
    });
  });

  it("uses Uniwind adaptive themes for the system preference", () => {
    applyNativeThemeSettings({ theme: "system", default_accent: 0 }, "dark");

    expect(mocks.setUniwindTheme).toHaveBeenCalledOnce();
    expect(mocks.setUniwindTheme).toHaveBeenCalledWith("system");
    expect(mocks.setColorScheme).not.toHaveBeenCalled();
  });

  it("applies a custom accent using the live system color scheme", () => {
    applyNativeThemeSettings({ theme: "system", default_accent: 1 }, "dark");

    expect(mocks.setUniwindTheme.mock.calls).toEqual([["system"], ["blue-dark"]]);
    expect(mocks.setColorScheme).not.toHaveBeenCalled();
  });

  it("keeps explicit themes fixed", () => {
    applyNativeThemeSettings({ theme: "dark", default_accent: 1 }, "light");

    expect(mocks.setUniwindTheme).toHaveBeenCalledWith("blue-dark");
    expect(mocks.setColorScheme).toHaveBeenCalledWith("dark");
  });

  it("does not reset native appearance when reapplying a fixed custom theme", () => {
    const settings = { theme: "dark", default_accent: 2 } as const;
    applyNativeThemeSettings(settings, "light");
    mocks.setUniwindTheme.mockClear();
    mocks.setColorScheme.mockClear();

    // Appearance events and settings refetches must not restart the light/dark cycle.
    applyNativeThemeSettings({ ...settings }, "dark");
    applyNativeThemeSettings({ ...settings }, "light");

    expect(mocks.uniwind.currentTheme).toBe("peach-dark");
    expect(mocks.colorScheme).toBe("dark");
    expect(mocks.setUniwindTheme).not.toHaveBeenCalled();
    expect(mocks.setColorScheme).not.toHaveBeenCalled();
  });

  it("still applies a different account's accent and appearance", () => {
    applyNativeThemeSettings({ theme: "dark", default_accent: 2 });
    applyNativeThemeSettings({ theme: "light", default_accent: 1 });

    expect(mocks.uniwind.currentTheme).toBe("blue-light");
    expect(mocks.colorScheme).toBe("light");
  });

  it("restores adaptive appearance when leaving a fixed custom theme", () => {
    applyNativeThemeSettings({ theme: "dark", default_accent: 2 });
    applyNativeThemeSettings({ theme: "system", default_accent: 0 });

    expect(mocks.setUniwindTheme).toHaveBeenLastCalledWith("system");
    expect(mocks.colorScheme).toBe("light");
  });

  it("disables adaptive themes when the fixed theme matches the current OS theme", () => {
    applyNativeThemeSettings({ theme: "light", default_accent: 0 });

    expect(mocks.uniwind.hasAdaptiveThemes).toBe(false);
    expect(mocks.uniwind.currentTheme).toBe("light");
  });
});
