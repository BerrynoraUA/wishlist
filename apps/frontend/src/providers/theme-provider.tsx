"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/api/user";
import { upsertKnownAccount } from "@/lib/known-accounts";
import {
  buildAccentCookie,
  buildResolvedThemeCookie,
  buildThemeCookie,
  resolveThemePreference,
  type ResolvedTheme,
} from "@/lib/theme";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import type { ThemePreference } from "@/types/settings";
import { WishlistAccent } from "@/types/wishlist";

const ACCENT_TOKENS: Record<
  WishlistAccent,
  {
    light: { brand: string; brandDark: string; brandLight: string; brandLighter: string };
    dark: { brand: string; brandDark: string; brandLight: string; brandLighter: string };
  }
> = {
  [WishlistAccent.Pink]: {
    light: {
      brand: "#c0267e",
      brandDark: "#9b1f66",
      brandLight: "#fde7f3",
      brandLighter: "#fdf2f8",
    },
    dark: {
      brand: "#e052a0",
      brandDark: "#c0267e",
      brandLight: "#3d1a2e",
      brandLighter: "#2a1220",
    },
  },
  [WishlistAccent.Blue]: {
    light: {
      brand: "#2563eb",
      brandDark: "#1d4ed8",
      brandLight: "#dbeafe",
      brandLighter: "#eff6ff",
    },
    dark: {
      brand: "#60a5fa",
      brandDark: "#3b82f6",
      brandLight: "#1e293b",
      brandLighter: "#172033",
    },
  },
  [WishlistAccent.Peach]: {
    light: {
      brand: "#d97706",
      brandDark: "#b45309",
      brandLight: "#fef3c7",
      brandLighter: "#fffbeb",
    },
    dark: {
      brand: "#fbbf24",
      brandDark: "#d97706",
      brandLight: "#2a2010",
      brandLighter: "#1f1a0e",
    },
  },
  [WishlistAccent.Mint]: {
    light: {
      brand: "#059669",
      brandDark: "#047857",
      brandLight: "#d1fae5",
      brandLighter: "#ecfdf5",
    },
    dark: {
      brand: "#34d399",
      brandDark: "#10b981",
      brandLight: "#132a20",
      brandLighter: "#0f1f18",
    },
  },
  [WishlistAccent.Lavender]: {
    light: {
      brand: "#7c3aed",
      brandDark: "#6d28d9",
      brandLight: "#ede9fe",
      brandLighter: "#f5f3ff",
    },
    dark: {
      brand: "#a78bfa",
      brandDark: "#8b5cf6",
      brandLight: "#241d3a",
      brandLighter: "#1c162e",
    },
  },
};

function applyAccentTokens(accent: WishlistAccent, resolvedTheme: ResolvedTheme) {
  const tokens =
    ACCENT_TOKENS[accent]?.[resolvedTheme] ?? ACCENT_TOKENS[WishlistAccent.Pink][resolvedTheme];
  const root = document.documentElement;
  root.style.setProperty("--color-brand", tokens.brand);
  root.style.setProperty("--color-brand-dark", tokens.brandDark);
  root.style.setProperty("--color-brand-light", tokens.brandLight);
  root.style.setProperty("--color-brand-lighter", tokens.brandLighter);

  const alphaSteps = [
    ["--brand-alpha-06", 0.06],
    ["--brand-alpha-08", 0.08],
    ["--brand-alpha-10", 0.1],
    ["--brand-alpha-12", 0.12],
    ["--brand-alpha-15", 0.15],
    ["--brand-alpha-20", 0.2],
    ["--brand-alpha-25", 0.25],
    ["--brand-alpha-30", 0.3],
    ["--brand-alpha-35", 0.35],
  ] as const;

  for (const [varName, alpha] of alphaSteps) {
    root.style.setProperty(
      varName,
      `color-mix(in srgb, ${tokens.brand} ${Math.round(alpha * 100)}%, transparent)`,
    );
  }

  root.style.setProperty(
    "--input-focus-border",
    `color-mix(in srgb, ${tokens.brand} 40%, transparent)`,
  );
  root.style.setProperty(
    "--input-focus-ring",
    `color-mix(in srgb, ${tokens.brand} 8%, transparent)`,
  );
  root.style.setProperty("--selection-bg", `color-mix(in srgb, ${tokens.brand} 15%, transparent)`);
  root.style.setProperty(
    "--shadow-brand",
    `0 4px 14px color-mix(in srgb, ${tokens.brand} 30%, transparent)`,
  );
  root.style.setProperty(
    "--shadow-brand-lg",
    `0 8px 30px color-mix(in srgb, ${tokens.brand} 20%, transparent)`,
  );
  root.style.setProperty(
    "--gradient-brand-subtle",
    `linear-gradient(135deg, ${tokens.brandLight}, ${tokens.brandLighter})`,
  );
  root.style.setProperty(
    "--color-pro-border",
    `color-mix(in srgb, ${tokens.brand} 25%, transparent)`,
  );
  root.style.setProperty(
    "--color-pro-glow",
    `color-mix(in srgb, ${tokens.brand} 15%, transparent)`,
  );
  root.style.setProperty("--radial-brand", `color-mix(in srgb, ${tokens.brand} 6%, transparent)`);

  if (resolvedTheme === "dark") {
    root.style.setProperty(
      "--gradient-header",
      `linear-gradient(135deg, #111114 0%, ${tokens.brandLighter} 50%, ${tokens.brandLight} 100%)`,
    );
    root.style.setProperty(
      "--gradient-hero",
      `linear-gradient(135deg, #111114, ${tokens.brandLighter}, ${tokens.brandLight})`,
    );
    return;
  }

  root.style.setProperty(
    "--gradient-header",
    `linear-gradient(135deg, #fffafa 0%, ${tokens.brandLighter} 50%, ${tokens.brandLight} 100%)`,
  );
  root.style.setProperty(
    "--gradient-hero",
    `linear-gradient(135deg, #fffafa, ${tokens.brandLighter}, ${tokens.brandLight})`,
  );
}

type AppThemeContextValue = {
  persistedTheme: ThemePreference;
  activeTheme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTemporaryTheme: (theme: ResolvedTheme) => void;
  setPersistedTheme: (theme: ThemePreference) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error("useAppTheme must be used within Providers");
  return context;
}

export function ThemeProvider({
  children,
  initialTheme,
  initialResolvedTheme,
  initialAccent,
}: {
  children: React.ReactNode;
  initialTheme: ThemePreference;
  initialResolvedTheme: ResolvedTheme;
  initialAccent: number;
}) {
  const { data: settings } = useSettings();
  const { mutate: mutateSettings } = useUpdateSettings();
  const [pendingPersistedTheme, setPendingPersistedTheme] = useState<ThemePreference | null>(null);
  const [temporaryTheme, setTemporaryTheme] = useState<ResolvedTheme | null>(null);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(initialResolvedTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const persistedTheme = pendingPersistedTheme ?? settings?.theme ?? initialTheme;
  const activeTheme = temporaryTheme ?? persistedTheme;
  const resolvedTheme = resolveThemePreference(activeTheme, systemTheme);
  const accent = settings?.default_accent ?? (initialAccent as WishlistAccent);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    document.cookie = buildThemeCookie(persistedTheme);
    document.cookie = buildResolvedThemeCookie(resolvedTheme);
  }, [persistedTheme, resolvedTheme]);

  useEffect(() => {
    applyAccentTokens(accent, resolvedTheme);
    document.cookie = buildAccentCookie(accent);
  }, [accent, resolvedTheme]);

  useEffect(() => {
    if (settings?.default_accent === undefined || settings?.default_accent === null) return;
    getCurrentUser()
      .then((user) => {
        if (!user?.id) return;
        upsertKnownAccount({
          userId: user.id,
          defaultAccent: settings.default_accent,
          themePreference: settings.theme,
        });
      })
      .catch(() => {});
  }, [settings?.default_accent, settings?.theme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      persistedTheme,
      activeTheme,
      resolvedTheme,
      setTemporaryTheme,
      setPersistedTheme: (theme) => {
        setPendingPersistedTheme(theme);
        setTemporaryTheme(null);
        mutateSettings(
          { theme },
          {
            onSettled: () => {
              setPendingPersistedTheme(null);
            },
          },
        );
      },
    }),
    [activeTheme, mutateSettings, persistedTheme, resolvedTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}
