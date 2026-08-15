import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setColorScheme: vi.fn(),
  setUniwindTheme: vi.fn(),
  uniwind: { currentTheme: "light" },
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
  Appearance: { setColorScheme: mocks.setColorScheme },
}));

vi.mock("uniwind", () => ({
  Uniwind: {
    get currentTheme() {
      return mocks.uniwind.currentTheme;
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
});
