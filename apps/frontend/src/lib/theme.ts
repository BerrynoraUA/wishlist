import type { ThemePreference } from "@/types/settings";

export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE_NAME = "bn_theme";
export const RESOLVED_THEME_COOKIE_NAME = "bn_resolved_theme";
export const ACCENT_COOKIE_NAME = "bn_accent";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
export const DEFAULT_ACCENT = 0;
export const INSTANT_THEME_CLASS = "account-switching-theme";

export type ThemeAndAccent = {
  theme: ThemePreference;
  accent: number;
};

export function parseThemePreference(value: string | null | undefined): ThemePreference | null {
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

export function parseResolvedTheme(value: string | null | undefined): ResolvedTheme | null {
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

export function getSystemResolvedTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
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

const ACCENT_MAP: Record<
  number,
  Record<"light" | "dark", { b: string; d: string; l: string; r: string }>
> = {
  0: {
    light: { b: "#c0267e", d: "#9b1f66", l: "#fde7f3", r: "#fdf2f8" },
    dark: { b: "#e052a0", d: "#c0267e", l: "#3d1a2e", r: "#2a1220" },
  },
  1: {
    light: { b: "#2563eb", d: "#1d4ed8", l: "#dbeafe", r: "#eff6ff" },
    dark: { b: "#60a5fa", d: "#3b82f6", l: "#1e293b", r: "#172033" },
  },
  2: {
    light: { b: "#d97706", d: "#b45309", l: "#fef3c7", r: "#fffbeb" },
    dark: { b: "#fbbf24", d: "#d97706", l: "#2a2010", r: "#1f1a0e" },
  },
  3: {
    light: { b: "#059669", d: "#047857", l: "#d1fae5", r: "#ecfdf5" },
    dark: { b: "#34d399", d: "#10b981", l: "#132a20", r: "#0f1f18" },
  },
  4: {
    light: { b: "#7c3aed", d: "#6d28d9", l: "#ede9fe", r: "#f5f3ff" },
    dark: { b: "#a78bfa", d: "#8b5cf6", l: "#241d3a", r: "#1c162e" },
  },
};

export function getAccentInlineStyles(
  accent: number,
  resolvedTheme: ResolvedTheme,
): Record<string, string> {
  const t = (ACCENT_MAP[accent] ?? ACCENT_MAP[0])[resolvedTheme];
  const cm = (pct: number) => `color-mix(in srgb, ${t.b} ${pct}%, transparent)`;
  const bg = resolvedTheme === "dark" ? "#111114" : "#fffafa";

  return {
    "--color-brand": t.b,
    "--color-brand-dark": t.d,
    "--color-brand-light": t.l,
    "--color-brand-lighter": t.r,
    "--brand-alpha-06": cm(6),
    "--brand-alpha-08": cm(8),
    "--brand-alpha-10": cm(10),
    "--brand-alpha-12": cm(12),
    "--brand-alpha-15": cm(15),
    "--brand-alpha-20": cm(20),
    "--brand-alpha-25": cm(25),
    "--brand-alpha-30": cm(30),
    "--brand-alpha-35": cm(35),
    "--input-focus-border": cm(40),
    "--input-focus-ring": cm(8),
    "--selection-bg": cm(15),
    "--shadow-brand": `0 4px 14px ${cm(30)}`,
    "--shadow-brand-lg": `0 8px 30px ${cm(20)}`,
    "--gradient-brand-subtle": `linear-gradient(135deg, ${t.l}, ${t.r})`,
    "--radial-brand": cm(6),
    "--color-pro-border": cm(25),
    "--color-pro-glow": cm(15),
    "--gradient-header": `linear-gradient(135deg, ${bg} 0%, ${t.r} 50%, ${t.l} 100%)`,
    "--gradient-hero": `linear-gradient(135deg, ${bg}, ${t.r}, ${t.l})`,
  };
}

export function applyThemeAndAccentSynchronously({ theme, accent }: ThemeAndAccent) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add(INSTANT_THEME_CLASS);

  const resolvedTheme = resolveThemePreference(theme, getSystemResolvedTheme());
  document.cookie = buildThemeCookie(theme);
  document.cookie = buildResolvedThemeCookie(resolvedTheme);
  document.cookie = buildAccentCookie(accent);

  root.setAttribute("data-theme", resolvedTheme);
  root.style.colorScheme = resolvedTheme;
  const styles = getAccentInlineStyles(accent, resolvedTheme);
  for (const [name, value] of Object.entries(styles)) {
    root.style.setProperty(name, value);
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove(INSTANT_THEME_CLASS);
    });
  });
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
  root.style.setProperty("--radial-brand", "color-mix(in srgb, " + t.b + " 6%, transparent)");
  root.style.setProperty("--color-pro-border", "color-mix(in srgb, " + t.b + " 25%, transparent)");
  root.style.setProperty("--color-pro-glow", "color-mix(in srgb, " + t.b + " 15%, transparent)");
  var bg = resolvedTheme === "dark" ? "#111114" : "#fffafa";
  root.style.setProperty("--gradient-header", "linear-gradient(135deg, " + bg + " 0%, " + t.r + " 50%, " + t.l + " 100%)");
  root.style.setProperty("--gradient-hero", "linear-gradient(135deg, " + bg + ", " + t.r + ", " + t.l + ")");
})();`;
}
