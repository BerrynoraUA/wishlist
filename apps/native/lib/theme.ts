import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import type { ThemePreference, UserSettings } from "@wishlist/backend/types/settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";
import * as SecureStore from "expo-secure-store";
import { useMemo } from "react";
import { Appearance } from "react-native";
import { Uniwind, useCSSVariable } from "uniwind";

export type NativeThemeMode = "light" | "dark";

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
] as const satisfies readonly { name: string; label: string; swatchClassName: string }[];

export type NativeAccentName = (typeof NATIVE_ACCENTS)[number]["name"];
export type CachedNativeThemeSettings = Pick<UserSettings, "theme" | "default_accent">;

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

const WISHLIST_TO_NATIVE_ACCENT: Record<WishlistAccent, NativeAccentName> = {
  [WishlistAccent.Pink]: "pink",
  [WishlistAccent.Blue]: "blue",
  [WishlistAccent.Peach]: "peach",
  [WishlistAccent.Mint]: "mint",
  [WishlistAccent.Lavender]: "lavender",
};

const NATIVE_ACCENT_SET = new Set<string>(NATIVE_ACCENTS.map((a) => a.name));
const THEME_SETTINGS_STORE_KEY_PREFIX = "wishlist.native.theme-settings.v1.";
const THEME_PREFERENCE_SET = new Set<ThemePreference>(["light", "dark", "system"]);
const WISHLIST_ACCENT_SET = new Set<WishlistAccent>(
  Object.values(WishlistAccent).filter(
    (value): value is WishlistAccent => typeof value === "number",
  ),
);
let activeThemeSettingsSnapshot: { userId: string; settings: CachedNativeThemeSettings } | null =
  null;

function isNativeAccentName(accent: string): accent is NativeAccentName {
  return NATIVE_ACCENT_SET.has(accent);
}

function navigationThemeFromResolved(
  mode: NativeThemeMode,
  css: {
    bg: unknown;
    text: unknown;
    card: unknown;
    border: unknown;
    primary: unknown;
    destructive: unknown;
  },
): Theme {
  const base = mode === "dark" ? DarkTheme : DefaultTheme;
  const { colors: c } = base;

  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

  return {
    ...base,
    dark: mode === "dark",
    colors: {
      ...c,
      background: str(css.bg, c.background),
      text: str(css.text, c.text),
      card: str(css.card, c.card),
      border: str(css.border, c.border),
      primary: str(css.primary, c.primary),
      notification: str(css.destructive, c.notification),
    },
  };
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
  return WISHLIST_TO_NATIVE_ACCENT[accent ?? WishlistAccent.Pink];
}

export function getNativeThemeName(
  mode: NativeThemeMode,
  accent: NativeAccentName,
): NativeThemeName {
  return accent === "pink" ? mode : (`${accent}-${mode}` as NativeThemeName);
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

function getCachedThemeSettingsKey(userId: string) {
  return `${THEME_SETTINGS_STORE_KEY_PREFIX}${userId}`;
}

function isCachedNativeThemeSettings(value: unknown): value is CachedNativeThemeSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CachedNativeThemeSettings>;

  return (
    typeof candidate.theme === "string" &&
    THEME_PREFERENCE_SET.has(candidate.theme as ThemePreference) &&
    typeof candidate.default_accent === "number" &&
    WISHLIST_ACCENT_SET.has(candidate.default_accent)
  );
}

export async function readCachedNativeThemeSettings(
  userId: string,
): Promise<CachedNativeThemeSettings | null> {
  const raw = await SecureStore.getItemAsync(getCachedThemeSettingsKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isCachedNativeThemeSettings(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCachedNativeThemeSettings(
  userId: string,
  settings: CachedNativeThemeSettings,
) {
  activeThemeSettingsSnapshot = { userId, settings };
  await SecureStore.setItemAsync(getCachedThemeSettingsKey(userId), JSON.stringify(settings));
}

export function getActiveNativeThemeSettingsSnapshot(userId: string) {
  return activeThemeSettingsSnapshot?.userId === userId
    ? activeThemeSettingsSnapshot.settings
    : null;
}

export function setActiveNativeThemeSettingsSnapshot(
  userId: string,
  settings: CachedNativeThemeSettings,
) {
  activeThemeSettingsSnapshot = { userId, settings };
}

export function applyNativeThemeSettings(settings: CachedNativeThemeSettings) {
  if (settings.theme !== "system") {
    Uniwind.setTheme(
      getNativeThemeNameForPreference(settings.theme, settings.default_accent, null),
    );
    Appearance.setColorScheme(settings.theme);
    return;
  }

  Appearance.setColorScheme("unspecified");
  Uniwind.setTheme(
    getNativeThemeNameForPreference("system", settings.default_accent, Appearance.getColorScheme()),
  );
}

/** React Navigation colors from Uniwind / `global.css` tokens. */
export function useNavigationTheme(theme: string | null | undefined): Theme {
  const mode = getThemeMode(theme);

  const bg = useCSSVariable("--color-bg");
  const text = useCSSVariable("--color-text");
  const card = useCSSVariable("--color-card");
  const border = useCSSVariable("--color-border");
  const primary = useCSSVariable("--color-primary");
  const destructive = useCSSVariable("--color-destructive");

  return useMemo(
    () =>
      navigationThemeFromResolved(mode, {
        bg,
        text,
        card,
        border,
        primary,
        destructive,
      }),
    [mode, bg, text, card, border, primary, destructive],
  );
}
