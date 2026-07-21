import "@/polyfills/gtIntlPolyfills";
import "@/global.css";

import {
  useNotificationResponseObserver,
  useRegisterPushNotifications,
} from "@/hooks/use-notifications";
import { NotificationPermissionSheet } from "@/components/notifications/notification-permission-sheet";
import { useSettings } from "@/hooks/use-settings";
import {
  applyNativeThemeSettings,
  type CachedNativeThemeSettings,
  getActiveNativeThemeSettingsSnapshot,
  getThemeMode,
  readCachedNativeThemeSettings,
  setActiveNativeThemeSettingsSnapshot,
  useNavigationTheme,
  writeCachedNativeThemeSettings,
} from "@/lib/theme";
import { upsertKnownAccount } from "@/lib/known-accounts";
import { AnimatedSplash, MarkAppReady } from "@/components/splash/animated-splash";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { SubscriptionProvider } from "@/providers/subscription-provider";
import { UserGuideProvider } from "@/components/user-guide/user-guide-provider";
import { AppStateLifecycle } from "@/components/providers/native-query-lifecycle";
import { ThemeProvider } from "expo-router/react-navigation";
import { PortalHost } from "@rn-primitives/portal";
import { ReanimatedTrueSheetProvider } from "@lodev09/react-native-true-sheet/reanimated";
import { PostHogEventProperties } from "@posthog/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GTProvider } from "gt-react-native";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { ActivityIndicator, Appearance, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";
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
    <AnimatedSplash>
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
            <AppStateLifecycle />
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
    </AnimatedSplash>
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

  if (session) {
    return (
      <AuthenticatedThemeGate key={session.user.id}>
        <AuthRedirector />
        <NotificationPushBootstrap />
        <RootStack initialRouteName="(tabs)" />
      </AuthenticatedThemeGate>
    );
  }

  return (
    <>
      <MarkAppReady />
      <AuthRedirector />
      <RootStack initialRouteName="(auth)" />
    </>
  );
}

function RootStack({ initialRouteName }: { initialRouteName: "(auth)" | "(tabs)" }) {
  return (
    <Stack initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="subscription" />
    </Stack>
  );
}

function AuthRedirector() {
  const { session } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const rootSegment = segments[0];

  useEffect(() => {
    const isAuthenticatedRoute = rootSegment === "(tabs)" || rootSegment === "subscription";

    if (session && !isAuthenticatedRoute) {
      router.replace("/(tabs)/wishlists" as never);
      return;
    }

    if (!session && rootSegment === "(tabs)") {
      router.replace("/(auth)/sign-in" as never);
    }
  }, [rootSegment, router, session]);

  return null;
}

function NotificationPushBootstrap() {
  const { user } = useAuth();
  useRegisterPushNotifications();
  useNotificationResponseObserver();

  return user?.id ? <NotificationPermissionSheet userId={user.id} /> : null;
}

function AuthenticatedThemeGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const initialSnapshot = userId ? getActiveNativeThemeSettingsSnapshot(userId) : null;
  const { data: settings, error: settingsError } = useSettings();
  const [cachedSettings, setCachedSettings] = useState<CachedNativeThemeSettings | null>(
    () => initialSnapshot,
  );
  const [themeApplied, setThemeApplied] = useState(false);
  const themeSettings = settings ?? cachedSettings ?? DEFAULT_SETTINGS;
  const ready = Boolean(settings || cachedSettings || settingsError);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    setCachedSettings(getActiveNativeThemeSettingsSnapshot(userId));
    void readCachedNativeThemeSettings(userId)
      .then((nextSettings) => {
        if (active) setCachedSettings(nextSettings);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !settings) return;

    const nextSettings = {
      theme: settings.theme,
      default_accent: settings.default_accent,
    };

    setActiveNativeThemeSettingsSnapshot(userId, nextSettings);
    void writeCachedNativeThemeSettings(userId, nextSettings).catch(() => {});

    void upsertKnownAccount({
      userId,
      defaultAccent: settings.default_accent,
      themePreference: settings.theme,
    }).catch(() => {});
  }, [userId, settings]);

  useLayoutEffect(() => {
    if (!ready) return;
    applyNativeThemeSettings(themeSettings);
    setThemeApplied(true);
  }, [ready, themeSettings]);

  useEffect(() => {
    if (!ready || themeSettings.theme !== "system") return;
    const timeout = setTimeout(() => {
      applyNativeThemeSettings(themeSettings);
    }, 0);

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === "light" || colorScheme === "dark") {
        applyNativeThemeSettings(themeSettings);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [ready, themeSettings]);

  if (!ready || !themeApplied) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator colorClassName="accent-brand" />
      </View>
    );
  }

  return (
    <>
      <MarkAppReady />
      {children}
    </>
  );
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
