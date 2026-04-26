import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

export const NATIVE_THEME_NAMES = [
  "light",
  "dark",
  "pink",
  "pink-dark",
  "blue",
  "blue-dark",
  "peach",
  "peach-dark",
  "mint",
  "mint-dark",
  "lavender",
  "lavender-dark",
] as const;

export type NativeThemeName = (typeof NATIVE_THEME_NAMES)[number];
export type NativeThemeMode = "light" | "dark";
export type NativeAccentName = "pink" | "blue" | "peach" | "mint" | "lavender";

export const NATIVE_ACCENTS = [
  {
    name: "pink",
    label: "Pink",
    swatchClassName: "bg-gradient-accent-pink",
  },
  {
    name: "blue",
    label: "Blue",
    swatchClassName: "bg-gradient-accent-blue",
  },
  {
    name: "peach",
    label: "Peach",
    swatchClassName: "bg-gradient-accent-peach",
  },
  {
    name: "mint",
    label: "Mint",
    swatchClassName: "bg-gradient-accent-mint",
  },
  {
    name: "lavender",
    label: "Lavender",
    swatchClassName: "bg-gradient-accent-lavender",
  },
] as const satisfies readonly {
  name: NativeAccentName;
  label: string;
  swatchClassName: string;
}[];

type ThemePalette = {
  mode: NativeThemeMode;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  primary: string;
};

const LIGHT_BASE = {
  background: "#faf7f8",
  card: "#ffffff",
  text: "#111827",
  border: "#f3e8ee",
  notification: "#b91c1c",
};

const DARK_BASE = {
  background: "#0c0c0f",
  card: "#161619",
  text: "#f0f0f2",
  border: "#27272d",
  notification: "#ef4444",
};

const THEME_PALETTES: Record<NativeThemeName, ThemePalette> = {
  light: { mode: "light", ...LIGHT_BASE, primary: "#c0267e" },
  dark: { mode: "dark", ...DARK_BASE, primary: "#e052a0" },
  pink: { mode: "light", ...LIGHT_BASE, primary: "#c0267e" },
  "pink-dark": { mode: "dark", ...DARK_BASE, primary: "#e052a0" },
  blue: { mode: "light", ...LIGHT_BASE, primary: "#2563eb" },
  "blue-dark": { mode: "dark", ...DARK_BASE, primary: "#60a5fa" },
  peach: { mode: "light", ...LIGHT_BASE, primary: "#d97706" },
  "peach-dark": { mode: "dark", ...DARK_BASE, primary: "#fbbf24" },
  mint: { mode: "light", ...LIGHT_BASE, primary: "#059669" },
  "mint-dark": { mode: "dark", ...DARK_BASE, primary: "#34d399" },
  lavender: { mode: "light", ...LIGHT_BASE, primary: "#7c3aed" },
  "lavender-dark": { mode: "dark", ...DARK_BASE, primary: "#a78bfa" },
};

function createNavigationTheme(palette: ThemePalette): Theme {
  const baseTheme = palette.mode === "dark" ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    dark: palette.mode === "dark",
    colors: {
      ...baseTheme.colors,
      background: palette.background,
      border: palette.border,
      card: palette.card,
      notification: palette.notification,
      primary: palette.primary,
      text: palette.text,
    },
  };
}

function isNativeThemeName(theme: string | null | undefined): theme is NativeThemeName {
  return NATIVE_THEME_NAMES.includes(theme as NativeThemeName);
}

function isNativeAccentName(accent: string): accent is NativeAccentName {
  return NATIVE_ACCENTS.some((nativeAccent) => nativeAccent.name === accent);
}

export function getThemeMode(theme: string | null | undefined): NativeThemeMode {
  return theme === "dark" || theme?.endsWith("-dark") ? "dark" : "light";
}

export function getThemeAccent(theme: string | null | undefined): NativeAccentName {
  if (theme === "light" || theme === "dark" || theme == null) {
    return "pink";
  }

  const accent = theme.replace("-dark", "");
  return isNativeAccentName(accent) ? accent : "pink";
}

export function getNativeThemeName(
  mode: NativeThemeMode,
  accent: NativeAccentName,
): NativeThemeName {
  if (accent === "pink") {
    return mode === "dark" ? "dark" : "light";
  }

  return mode === "dark" ? `${accent}-dark` : accent;
}

export function getNavigationTheme(theme: string | null | undefined): Theme {
  return NAV_THEME[isNativeThemeName(theme) ? theme : "light"];
}

export const NAV_THEME: Record<NativeThemeName, Theme> = Object.fromEntries(
  NATIVE_THEME_NAMES.map((theme) => [theme, createNavigationTheme(THEME_PALETTES[theme])]),
) as Record<NativeThemeName, Theme>;
