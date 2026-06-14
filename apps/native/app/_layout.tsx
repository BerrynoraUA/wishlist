import "@/polyfills/gtIntlPolyfills";
import "@/global.css";

import { useSettings } from "@/hooks/use-settings";
import { getNativeThemeNameForPreference, getThemeMode, useNavigationTheme } from "@/lib/theme";
import { upsertKnownAccount } from "@/lib/known-accounts";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { SubscriptionProvider } from "@/providers/subscription-provider";
import { UserGuideProvider } from "@/components/user-guide/user-guide-provider";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { ReanimatedTrueSheetProvider } from "@lodev09/react-native-true-sheet/reanimated";
import { PostHogEventProperties } from "@posthog/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GTProvider } from "gt-react-native";
import { useEffect, useState } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { ActivityIndicator, Appearance, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";
import { DEFAULT_SETTINGS } from "@wishlist/backend/types/settings";
import gtConfig from "../gt.config.json";
import { loadTranslations } from "../loadTranslations";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const posthogHost = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(
  /\/+$/,
  "",
);
const posthogEnabled = Boolean(posthogApiKey);

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            retry: 2,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);
  const navigationTheme = useNavigationTheme(theme);

  return (
    <PostHogProvider
      apiKey={posthogEnabled ? posthogApiKey : "__POSTHOG_DISABLED__"}
      options={{
        host: posthogHost,
        disabled: !posthogEnabled,
      }}
      autocapture={{ captureScreens: false }}
    >
      <GTProvider
        config={gtConfig}
        devApiKey={process.env.EXPO_PUBLIC_GT_DEV_API_KEY}
        loadTranslations={loadTranslations}
        projectId={process.env.EXPO_PUBLIC_GT_PROJECT_ID}
        renderSettings={{
          method: "skeleton",
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <PostHogScreenTracker />
              <ThemeProvider value={navigationTheme}>
                <SafeAreaProvider>
                  <ReanimatedTrueSheetProvider>
                    <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
                    <UserGuideProvider>
                    <AuthGate />
                      <PortalHost />
                    </UserGuideProvider>
                </ReanimatedTrueSheetProvider>
                </SafeAreaProvider>
              </ThemeProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </GTProvider>
    </PostHogProvider>
  );
}

function AuthGate() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator colorClassName="accent-brand" />
      </View>
    );
  }

  return (
    <>
      {session ? <NativeThemeSync /> : null}
      <Stack
        initialRouteName={session ? "(tabs)" : "(auth)"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subscription" />
      </Stack>
    </>
  );
}

function NativeThemeSync() {
  const { session } = useAuth();
  const { data: settings } = useSettings();
  const themePreference = settings?.theme ?? DEFAULT_SETTINGS.theme;
  const defaultAccent = settings?.default_accent ?? DEFAULT_SETTINGS.default_accent;

  useEffect(() => {
    if (!session?.user.id || settings?.default_accent == null) return;
    void upsertKnownAccount({
      userId: session.user.id,
      defaultAccent: settings.default_accent,
    }).catch(() => {});
  }, [session?.user.id, settings?.default_accent]);

  useEffect(() => {
    function applyTheme(systemColorScheme: string | null | undefined) {
      Uniwind.setTheme(
        getNativeThemeNameForPreference(themePreference, defaultAccent, systemColorScheme),
      );
    }

    if (themePreference !== "system") {
      Uniwind.setTheme(getNativeThemeNameForPreference(themePreference, defaultAccent, null));
      Appearance.setColorScheme(themePreference);
      return;
    }

    Appearance.setColorScheme("unspecified");
    applyTheme(Appearance.getColorScheme());

    const timeout = setTimeout(() => {
      applyTheme(Appearance.getColorScheme());
    }, 0);

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === "light" || colorScheme === "dark") {
        applyTheme(colorScheme);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [defaultAccent, themePreference]);

  return null;
}

function PostHogScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    void posthog.screen(pathname, params as PostHogEventProperties).catch(() => undefined);
  }, [pathname, params, posthog]);

  return null;
}
