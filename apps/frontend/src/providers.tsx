"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { initRevenueCat, resetRevenueCat } from "@/lib/revenuecat";
import { useSettings } from "@/hooks/use-settings";
import type { ThemePreference } from "@/types/settings";

type ResolvedTheme = "light" | "dark";

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

  if (!context) {
    throw new Error("useAppTheme must be used within Providers");
  }

  return context;
}

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();
  const [persistedTheme, setPersistedThemeState] =
    useState<ThemePreference>("system");
  const [temporaryTheme, setTemporaryTheme] = useState<ResolvedTheme | null>(
    null,
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const lastSettingsThemeRef = useRef<ThemePreference | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    const nextTheme = settings?.theme ?? "system";

    setPersistedThemeState((currentTheme) => {
      if (currentTheme === nextTheme) {
        return currentTheme;
      }

      return nextTheme;
    });

    if (lastSettingsThemeRef.current !== nextTheme) {
      setTemporaryTheme(null);
      lastSettingsThemeRef.current = nextTheme;
    }
  }, [settings?.theme]);

  const activeTheme = temporaryTheme ?? persistedTheme;
  const resolvedTheme = activeTheme === "system" ? systemTheme : activeTheme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      persistedTheme,
      activeTheme,
      resolvedTheme,
      setTemporaryTheme,
      setPersistedTheme: (theme) => {
        setPersistedThemeState(theme);
        setTemporaryTheme(null);
      },
    }),
    [activeTheme, persistedTheme, resolvedTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
  );
}

function RevenueCatInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (data.user) {
        initRevenueCat(data.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        initRevenueCat(session.user.id);
      } else {
        resetRevenueCat();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
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
      <AppThemeProvider>
        <RevenueCatInitializer>
          {children}
        </RevenueCatInitializer>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
