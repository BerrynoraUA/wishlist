import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import type { ThemePreference } from "@wishlist/backend/types/settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";

export const NATIVE_THEME_NAMES = [
  "light",
  "dark",
  "pink-light",
  "pink-dark",
  "blue-light",
  "blue-dark",
  "peach-light",
  "peach-dark",
  "mint-light",
  "mint-dark",
  "lavender-light",
  "lavender-dark",
] as const;

export type NativeThemeName = (typeof NATIVE_THEME_NAMES)[number];
export type NativeThemeMode = "light" | "dark";
export type NativeAccentName = "pink" | "blue" | "peach" | "mint" | "lavender";
export type NativeGradientColors = readonly [string, string, string];

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
  foreground: string;
  card: string;
  popover: string;
  primary: string;
  secondary: string;
  muted: string;
  accent: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
};

export const LIGHT_BASE_THEME_VARIABLES = {
  background: "#faf7f8",
  foreground: "#111827",
  card: "#ffffff",
  popover: "#ffffff",
  secondary: "#fdf2f8",
  muted: "#f4f4f5",
  accent: "#fce7f3",
  destructive: "#b91c1c",
  border: "#f3e8ee",
  input: "#f3e8ee",
  ring: "#c0267e",
  radius: "0.625rem",
};

export const DARK_BASE_THEME_VARIABLES = {
  background: "#0c0c0f",
  foreground: "#f0f0f2",
  card: "#161619",
  popover: "#161619",
  secondary: "#27272d",
  muted: "#27272d",
  accent: "#4a1d35",
  destructive: "#ef4444",
  border: "#27272d",
  input: "#27272d",
  ring: "#e052a0",
  radius: "0.625rem",
};

const THEME_PALETTES: Record<NativeThemeName, ThemePalette> = {
  light: { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#c0267e" },
  dark: { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#e052a0" },
  "pink-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#c0267e" },
  "pink-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#e052a0" },
  "blue-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#2563eb" },
  "blue-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#60a5fa" },
  "peach-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#d97706" },
  "peach-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#fbbf24" },
  "mint-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#059669" },
  "mint-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#34d399" },
  "lavender-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#7c3aed" },
  "lavender-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#a78bfa" },
};

const PRIMARY_GRADIENT_COLORS: Record<
  NativeThemeMode,
  Record<NativeAccentName, NativeGradientColors>
> = {
  light: {
    pink: ["#ec4899", "#c0267e", "#f472b6"],
    blue: ["#60a5fa", "#2563eb", "#93c5fd"],
    peach: ["#f59e0b", "#d97706", "#fbbf24"],
    mint: ["#10b981", "#059669", "#34d399"],
    lavender: ["#8b5cf6", "#7c3aed", "#a78bfa"],
  },
  dark: {
    pink: ["#f472b6", "#e052a0", "#f9a8d4"],
    blue: ["#93c5fd", "#60a5fa", "#bfdbfe"],
    peach: ["#fde68a", "#fbbf24", "#fef3c7"],
    mint: ["#6ee7b7", "#34d399", "#a7f3d0"],
    lavender: ["#c4b5fd", "#a78bfa", "#ddd6fe"],
  },
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
      notification: palette.destructive,
      primary: palette.primary,
      text: palette.foreground,
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

  const accent = theme.replace(/-(light|dark)$/, "");
  return isNativeAccentName(accent) ? accent : "pink";
}

export function getPrimaryGradientColors(theme: string | null | undefined): NativeGradientColors {
  return PRIMARY_GRADIENT_COLORS[getThemeMode(theme)][getThemeAccent(theme)];
}

export function getNativeAccentForWishlistAccent(
  accent: WishlistAccent | null | undefined,
): NativeAccentName {
  switch (accent) {
    case WishlistAccent.Blue:
      return "blue";
    case WishlistAccent.Peach:
      return "peach";
    case WishlistAccent.Mint:
      return "mint";
    case WishlistAccent.Lavender:
      return "lavender";
    case WishlistAccent.Pink:
    default:
      return "pink";
  }
}

export function getNativeThemeName(
  mode: NativeThemeMode,
  accent: NativeAccentName,
): NativeThemeName {
  return `${accent}-${mode}`;
}

export function getNativeThemeNameForPreference(
  preference: ThemePreference,
  accent: WishlistAccent | null | undefined,
  systemColorScheme: string | null | undefined,
): NativeThemeName {
  const mode =
    preference === "system" ? (systemColorScheme === "dark" ? "dark" : "light") : preference;

  return getNativeThemeName(mode, getNativeAccentForWishlistAccent(accent));
}

export function getNavigationTheme(theme: string | null | undefined): Theme {
  return NAV_THEME[isNativeThemeName(theme) ? theme : "light"];
}

export const NAV_THEME: Record<NativeThemeName, Theme> = Object.fromEntries(
  NATIVE_THEME_NAMES.map((theme) => [theme, createNavigationTheme(THEME_PALETTES[theme])]),
) as Record<NativeThemeName, Theme>;
