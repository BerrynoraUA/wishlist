import type { ThemePreference } from "@/types/settings";

export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE_NAME = "bn_theme";
export const RESOLVED_THEME_COOKIE_NAME = "bn_resolved_theme";
export const ACCENT_COOKIE_NAME = "bn_accent";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return null;
}

export function parseAccentCookie(value: string | null | undefined): number {
  if (value == null) return 0;
  const n = parseInt(value, 10);
  return n >= 0 && n <= 4 ? n : 0;
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

export function buildAccentCookie(accent: number): string {
  return `${ACCENT_COOKIE_NAME}=${accent}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function buildThemeInitScript(): string {
  return `(() => {
  var readCookie = function(name) {
    var prefix = name + "=";
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.indexOf(prefix) === 0) return p.slice(prefix.length);
    }
    return null;
  };
  var persistedTheme = readCookie("${THEME_COOKIE_NAME}");
  var resolvedTheme = persistedTheme === "light" || persistedTheme === "dark"
    ? persistedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  var root = document.documentElement;
  root.setAttribute("data-theme", resolvedTheme);
  root.style.colorScheme = resolvedTheme;
  document.cookie = "${RESOLVED_THEME_COOKIE_NAME}=" + resolvedTheme + "; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax";
  var a = parseInt(readCookie("${ACCENT_COOKIE_NAME}") || "0", 10) || 0;
  var T = {
    0:{light:{b:"#c0267e",d:"#9b1f66",l:"#fde7f3",r:"#fdf2f8"},dark:{b:"#e052a0",d:"#c0267e",l:"#3d1a2e",r:"#2a1220"}},
    1:{light:{b:"#2563eb",d:"#1d4ed8",l:"#dbeafe",r:"#eff6ff"},dark:{b:"#60a5fa",d:"#3b82f6",l:"#1e293b",r:"#172033"}},
    2:{light:{b:"#d97706",d:"#b45309",l:"#fef3c7",r:"#fffbeb"},dark:{b:"#fbbf24",d:"#d97706",l:"#2a2010",r:"#1f1a0e"}},
    3:{light:{b:"#059669",d:"#047857",l:"#d1fae5",r:"#ecfdf5"},dark:{b:"#34d399",d:"#10b981",l:"#132a20",r:"#0f1f18"}},
    4:{light:{b:"#7c3aed",d:"#6d28d9",l:"#ede9fe",r:"#f5f3ff"},dark:{b:"#a78bfa",d:"#8b5cf6",l:"#241d3a",r:"#1c162e"}}
  };
  var t = (T[a] || T[0])[resolvedTheme];
  root.style.setProperty("--color-brand", t.b);
  root.style.setProperty("--color-brand-dark", t.d);
  root.style.setProperty("--color-brand-light", t.l);
  root.style.setProperty("--color-brand-lighter", t.r);
  var alphas = [[6,"06"],[8,"08"],[10,"10"],[12,"12"],[15,"15"],[20,"20"],[25,"25"],[30,"30"],[35,"35"]];
  for (var i = 0; i < alphas.length; i++) {
    root.style.setProperty("--brand-alpha-" + alphas[i][1], "color-mix(in srgb, " + t.b + " " + alphas[i][0] + "%, transparent)");
  }
  root.style.setProperty("--input-focus-border", "color-mix(in srgb, " + t.b + " 40%, transparent)");
  root.style.setProperty("--input-focus-ring", "color-mix(in srgb, " + t.b + " 8%, transparent)");
  root.style.setProperty("--selection-bg", "color-mix(in srgb, " + t.b + " 15%, transparent)");
  root.style.setProperty("--shadow-brand", "0 4px 14px color-mix(in srgb, " + t.b + " 30%, transparent)");
  root.style.setProperty("--shadow-brand-lg", "0 8px 30px color-mix(in srgb, " + t.b + " 20%, transparent)");
  root.style.setProperty("--gradient-brand-subtle", "linear-gradient(135deg, " + t.l + ", " + t.r + ")");
})();`;
}
