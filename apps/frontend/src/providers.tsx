"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { initRevenueCat, resetRevenueCat } from "@/lib/revenuecat";
import { initPaddle, setOnCheckoutComplete } from "@/lib/paddle";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import type { ThemePreference } from "@/types/settings";
import {
  buildResolvedThemeCookie,
  buildThemeCookie,
  resolveThemePreference,
  type ResolvedTheme,
} from "@/lib/theme";

import { WishlistAccent } from "@/types/wishlist";

const ACCENT_TOKENS: Record<
  WishlistAccent,
  {
    light: {
      brand: string;
      brandDark: string;
      brandLight: string;
      brandLighter: string;
    };
    dark: {
      brand: string;
      brandDark: string;
      brandLight: string;
      brandLighter: string;
    };
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

function applyAccentTokens(
  accent: WishlistAccent,
  resolvedTheme: ResolvedTheme,
) {
  const tokens =
    ACCENT_TOKENS[accent]?.[resolvedTheme] ??
    ACCENT_TOKENS[WishlistAccent.Pink][resolvedTheme];
  const root = document.documentElement;
  root.style.setProperty("--color-brand", tokens.brand);
  root.style.setProperty("--color-brand-dark", tokens.brandDark);
  root.style.setProperty("--color-brand-light", tokens.brandLight);
  root.style.setProperty("--color-brand-lighter", tokens.brandLighter);

  // Rebuild alpha ramp from brand color
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

  // Focus ring / selection
  root.style.setProperty(
    "--input-focus-border",
    `color-mix(in srgb, ${tokens.brand} 40%, transparent)`,
  );
  root.style.setProperty(
    "--input-focus-ring",
    `color-mix(in srgb, ${tokens.brand} 8%, transparent)`,
  );
  root.style.setProperty(
    "--selection-bg",
    `color-mix(in srgb, ${tokens.brand} 15%, transparent)`,
  );
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

function AppThemeProvider({
  children,
  initialTheme,
  initialResolvedTheme,
}: {
  children: React.ReactNode;
  initialTheme: ThemePreference;
  initialResolvedTheme: ResolvedTheme;
}) {
  const { data: settings } = useSettings();
  const { mutate: mutateSettings } = useUpdateSettings();
  const [pendingPersistedTheme, setPendingPersistedTheme] =
    useState<ThemePreference | null>(null);
  const [temporaryTheme, setTemporaryTheme] = useState<ResolvedTheme | null>(
    null,
  );
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(initialResolvedTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const persistedTheme =
    pendingPersistedTheme ?? settings?.theme ?? initialTheme;
  const activeTheme = temporaryTheme ?? persistedTheme;
  const resolvedTheme = resolveThemePreference(activeTheme, systemTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    document.cookie = buildThemeCookie(persistedTheme);
    document.cookie = buildResolvedThemeCookie(resolvedTheme);
  }, [persistedTheme, resolvedTheme]);

  const accent = settings?.default_accent ?? WishlistAccent.Pink;

  useEffect(() => {
    applyAccentTokens(accent, resolvedTheme);
  }, [accent, resolvedTheme]);

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

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

/**
 * Initialises RevenueCat (auth-gated) and Paddle (always).
 * RevenueCat is used as the subscription state store.
 * Paddle is the web payment provider.
 */
function SdkInitializer({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (data.user) initRevenueCat(data.user.id);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session?.user) initRevenueCat(session.user.id);
      else resetRevenueCat();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setOnCheckoutComplete(() => {
      // Give the webhook a moment to process, then refresh subscription state
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      }, 3000);
    });
    initPaddle();
  }, [queryClient]);

  return <>{children}</>;
}

export function Providers({
  children,
  initialTheme,
  initialResolvedTheme,
}: {
  children: React.ReactNode;
  initialTheme: ThemePreference;
  initialResolvedTheme: ResolvedTheme;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider
        initialTheme={initialTheme}
        initialResolvedTheme={initialResolvedTheme}
      >
        <SdkInitializer>{children}</SdkInitializer>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
