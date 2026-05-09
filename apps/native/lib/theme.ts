import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import type { ThemePreference } from "@wishlist/backend/types/settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";

export type NativeThemeMode = "light" | "dark";
export type NativeAccentName = "pink" | "blue" | "peach" | "mint" | "lavender";

export const NATIVE_THEME_NAMES = [
  "light",
  "dark",
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

export const NATIVE_ACCENTS = [
  {
    name: "pink",
    label: "Pink",
    swatchClassName: "bg-linear-135 from-pink-300 via-pink-400 to-pink-600",
  },
  {
    name: "blue",
    label: "Blue",
    swatchClassName: "bg-linear-135 from-sky-300 via-blue-400 to-blue-600",
  },
  {
    name: "peach",
    label: "Peach",
    swatchClassName: "bg-linear-135 from-amber-200 via-orange-300 to-amber-500",
  },
  {
    name: "mint",
    label: "Mint",
    swatchClassName: "bg-linear-135 from-emerald-200 via-teal-300 to-emerald-500",
  },
  {
    name: "lavender",
    label: "Lavender",
    swatchClassName: "bg-linear-135 from-violet-200 via-purple-300 to-violet-500",
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
  "blue-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#2563eb" },
  "blue-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#60a5fa" },
  "peach-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#d97706" },
  "peach-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#fbbf24" },
  "mint-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#059669" },
  "mint-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#34d399" },
  "lavender-light": { mode: "light", ...LIGHT_BASE_THEME_VARIABLES, primary: "#7c3aed" },
  "lavender-dark": { mode: "dark", ...DARK_BASE_THEME_VARIABLES, primary: "#a78bfa" },
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
  if (accent === "pink") {
    return mode;
  }

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
