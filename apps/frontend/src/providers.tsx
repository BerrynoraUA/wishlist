"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { initRevenueCat, resetRevenueCat } from "@/lib/revenuecat";
import { useSettings } from "@/hooks/use-settings";

function ThemeSettingsSync() {
  const { data: settings } = useSettings();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!settings?.theme) return;
    if (theme === settings.theme) return;
    setTheme(settings.theme);
  }, [setTheme, settings?.theme, theme]);

  return null;
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
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RevenueCatInitializer>
          <ThemeSettingsSync />
          {children}
        </RevenueCatInitializer>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
