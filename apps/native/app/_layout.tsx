import { ensureIntlLocale } from "@/polyfills/gtIntlPolyfills";
import "@/global.css";

import {
  useNotificationResponseObserver,
  useRegisterPushNotifications,
} from "@/hooks/use-notifications";
import { NotificationPermissionSheet } from "@/components/notifications/notification-permission-sheet";
import { AppBlurTarget } from "@/components/ui/app-blur-target";
import { useProfile, useSettings } from "@/hooks/use-settings";
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
import {
  readBootLastUserId,
  readBootThemeSettings,
  writeBootThemeSettings,
} from "@/lib/boot-cache";
import { AnimatedSplash, MarkAppReady, useAppReady } from "@/components/splash/animated-splash";
import { ShowcaseCaptureCoordinator } from "@/components/showcase/showcase-capture-coordinator";
import { SHOWCASE_ENABLED } from "@/lib/showcase/showcase-control";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { SubscriptionProvider } from "@/providers/subscription-provider";
import { UserGuideProvider } from "@/components/user-guide/user-guide-provider";
import { AppStateLifecycle } from "@/components/providers/native-query-lifecycle";
import { ScraperSandbox } from "@/components/scraper/scraper-sandbox";
import { ThemeProvider } from "expo-router/react-navigation";
import { ReanimatedTrueSheetProvider } from "@lodev09/react-native-true-sheet/reanimated";
import { ShareIntentProvider } from "expo-share-intent";
import { PostHogEventProperties } from "@posthog/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GTProvider, useLocale, useSetLocale } from "gt-react-native";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { ActivityIndicator, DevSettings, useColorScheme, View } from "react-native";
import * as Updates from "expo-updates";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";
import { DEFAULT_SETTINGS } from "@wishlist/backend/types/settings";
import { syncLayoutDirection } from "@/lib/rtl";
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

// Apply the last session's theme before the first render, so the pre-auth and pre-settings
// spinners below come up in the right theme and accent instead of flashing default light.
// Skipped on a first-ever launch (nothing cached), and harmless when stale —
// `AuthenticatedThemeGate` re-applies from the real settings as soon as it has them.
const bootThemeSettings = readBootThemeSettings(readBootLastUserId());
if (bootThemeSettings) applyNativeThemeSettings(bootThemeSettings);

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
    // Outermost so a share received before sign-in survives the auth screens: the provider
    // holds the intent until `CreateMenuHost` mounts and consumes it.
    <ShareIntentProvider>
      <AnimatedSplash>
        <PostHogProvider
          apiKey={posthogEnabled ? posthogApiKey : "__POSTHOG_DISABLED__"}
          options={{
            host: posthogHost,
            disabled: !posthogEnabled,
            // Batch harder than the defaults: analytics should not be sending requests
            // while the app is still starting up and competing for the network.
            flushAt: 20,
            flushInterval: 30_000,
            preloadFeatureFlags: false,
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
            <IntlLocaleGate />
            <RtlDirectionGate />
            <QueryClientProvider client={queryClient}>
              <AppStateLifecycle />
              <AuthProvider>
                <SubscriptionProvider>
                  <PostHogScreenTracker />
                  <ThemeProvider value={navigationTheme}>
                    <SafeAreaProvider>
                      <ReanimatedTrueSheetProvider>
                        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
                        <AppBlurTarget>
                          <AuthGate />
                          <ShowcaseCaptureCoordinator />
                        </AppBlurTarget>
                      </ReanimatedTrueSheetProvider>
                    </SafeAreaProvider>
                  </ThemeProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </QueryClientProvider>
          </GTProvider>
        </PostHogProvider>
      </AnimatedSplash>
    </ShareIntentProvider>
  );
}

/**
 * Loads Intl locale data for the active locale. The module primes itself with the
 * device locale, but GT may resolve to a stored preference instead, and the user can
 * switch languages at runtime. Runs during render rather than in an effect so no
 * sibling ever formats against a locale whose data has not been installed. Rendered
 * before every other GTProvider child for the same reason.
 */
function IntlLocaleGate() {
  const locale = useLocale();
  ensureIntlLocale(locale);

  return null;
}

/**
 * Keeps the native layout direction in sync with the active locale. Switching
 * across the LTR/RTL boundary requires a reload for React Native to re-lay out,
 * so this reloads once when needed. Inert while all shipped locales are LTR.
 */
function RtlDirectionGate() {
  const locale = useLocale();
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (reloadedRef.current) return;
    if (!syncLayoutDirection(locale)) return;
    reloadedRef.current = true;
    void reloadForLayoutDirection();
  }, [locale]);

  return null;
}

async function reloadForLayoutDirection() {
  try {
    if (__DEV__) {
      DevSettings.reload();
      return;
    }
    await Updates.reloadAsync();
  } catch {
    try {
      DevSettings.reload();
    } catch {
      // Nothing else to try — the new direction applies on the next manual launch.
    }
  }
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
        <ProfilePrefetch />
        <NotificationPushBootstrap />
        {/* Inside the per-account subtree so the guide reads the right account's state,
            and never mounts at all on the auth screens. */}
        <UserGuideProvider>
          <RootStack initialRouteName="(tabs)" />
        </UserGuideProvider>
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

/**
 * Starts the profile query the moment there is a session, rather than when the profile
 * screen first mounts. It is one small GET, so it costs nothing next to the queries the
 * first screen already makes, and it means the settings form opens filled in instead of
 * mounting empty — which used to show every field's "required" error until the fetch landed.
 */
function ProfilePrefetch() {
  useProfile();

  return null;
}

function NotificationPushBootstrap() {
  const { user } = useAuth();
  const appReady = useAppReady();

  // Token registration is a permission check, an Expo push-token round trip and a POST,
  // none of which the first screen needs — hold them until the splash is gone. Showcase
  // captures skip it entirely so no OS permission dialog lands on a screenshot.
  useRegisterPushNotifications({ enabled: appReady && !SHOWCASE_ENABLED });
  // Stays eager: this replays the notification that launched the app, and deferring it
  // can drop that initial response entirely.
  useNotificationResponseObserver();

  if (SHOWCASE_ENABLED) return null;

  return user?.id ? <NotificationPermissionSheet userId={user.id} /> : null;
}

function AuthenticatedThemeGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const systemColorScheme = useColorScheme();
  const userId = session?.user.id;
  // Read synchronously, during the first render: the MMKV cache is what keeps the network
  // `useSettings()` query off the first-paint path. The in-memory snapshot wins when
  // present (it is the most recent), but it is always null on a cold start.
  const initialSnapshot = userId
    ? (getActiveNativeThemeSettingsSnapshot(userId) ?? readBootThemeSettings(userId))
    : null;
  const { data: settings, error: settingsError } = useSettings();
  const [cachedSettings, setCachedSettings] = useState<CachedNativeThemeSettings | null>(
    () => initialSnapshot,
  );
  const [themeApplied, setThemeApplied] = useState(false);
  const themeSettings = settings ?? cachedSettings ?? DEFAULT_SETTINGS;
  const ready = Boolean(settings || cachedSettings || settingsError);
  const locale = useLocale();
  const setLocale = useSetLocale();
  const localeSyncedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    setCachedSettings(
      getActiveNativeThemeSettingsSnapshot(userId) ?? readBootThemeSettings(userId),
    );

    // Migration path for users upgrading from the SecureStore-only cache, who have no
    // MMKV copy yet. Never downgrades a value we already have. Remove this — along with
    // read/writeCachedNativeThemeSettings in lib/theme.ts — one release after ship.
    void readCachedNativeThemeSettings(userId)
      .then((nextSettings) => {
        if (!active || !nextSettings) return;
        setCachedSettings((current) => current ?? nextSettings);
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
    writeBootThemeSettings(userId, nextSettings);
    void writeCachedNativeThemeSettings(userId, nextSettings).catch(() => {});

    void upsertKnownAccount({
      userId,
      defaultAccent: settings.default_accent,
      themePreference: settings.theme,
      preferredLocale: settings.preferred_locale,
    }).catch(() => {});
  }, [userId, settings]);

  // Sync the UI language to the account's preferred_locale once per mount. This component
  // remounts (key={session.user.id} in AuthGate) on every account switch, so the ref
  // naturally resets — matching the once-per-load guard used on web.
  useEffect(() => {
    if (localeSyncedRef.current) return;
    if (!settings) return;
    localeSyncedRef.current = true;
    if (!settings.preferred_locale) return;
    if (settings.preferred_locale === locale) return;
    setLocale(settings.preferred_locale);
  }, [settings?.preferred_locale, locale, setLocale]);

  useLayoutEffect(() => {
    if (!ready) return;
    applyNativeThemeSettings(themeSettings, systemColorScheme);
    setThemeApplied(true);
  }, [ready, systemColorScheme, themeSettings]);

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
      {/* Hidden WebViews used by the on-device product scraper. Mounted once
          per session, inside the authenticated tree — scraping only ever
          happens while adding or editing an item. */}
      <ScraperSandbox />
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
