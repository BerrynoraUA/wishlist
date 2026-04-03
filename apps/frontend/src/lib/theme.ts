import type { ThemePreference } from "@/types/settings";

export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE_NAME = "bn_theme";
export const RESOLVED_THEME_COOKIE_NAME = "bn_resolved_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return null;
}

export function parseResolvedTheme(
  value: string | null | undefined,
): ResolvedTheme | null {
  if (value === "light" || value === "dark") {
    return value;
  }

  return null;
}

export function resolveThemePreference(
  theme: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return theme === "system" ? systemTheme : theme;
}

export function getInitialResolvedTheme(
  theme: ThemePreference,
  fallbackTheme: string | null | undefined,
): ResolvedTheme {
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  return parseResolvedTheme(fallbackTheme) ?? "light";
}

export function buildThemeCookie(theme: ThemePreference): string {
  return `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function buildResolvedThemeCookie(theme: ResolvedTheme): string {
  return `${RESOLVED_THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function buildThemeInitScript(): string {
  return `(() => {
  const readCookie = (name) => {
    const prefix = name + "=";
    return document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? null;
  };
  const persistedTheme = readCookie("${THEME_COOKIE_NAME}");
  const resolvedTheme = persistedTheme === "light" || persistedTheme === "dark"
    ? persistedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  document.documentElement.setAttribute("data-theme", resolvedTheme);
  document.documentElement.style.colorScheme = resolvedTheme;
  document.cookie = "${RESOLVED_THEME_COOKIE_NAME}=" + resolvedTheme + "; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax";
})();`;
}