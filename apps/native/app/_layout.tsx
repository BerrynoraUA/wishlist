import "@/global.css";

import { getNavigationTheme, getThemeMode } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { SignInScreen } from "@/screens/sign-in-screen";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { createTrueSheetNavigator } from "@lodev09/react-native-true-sheet/navigation";
import { ReanimatedTrueSheetProvider } from "@lodev09/react-native-true-sheet/reanimated";
import { PostHogEventProperties } from "@posthog/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname, withLayoutContext } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GTProvider } from "gt-react-native";
import { useEffect, useState } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { ActivityIndicator, Appearance, View } from "react-native";
import { useUniwind } from "uniwind";
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
const { Navigator } = createTrueSheetNavigator();
const TrueSheetNavigator = withLayoutContext(Navigator);

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);
  const navigationTheme = getNavigationTheme(theme);

  useEffect(() => {
    Appearance.setColorScheme(themeMode);
  }, [themeMode]);

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
            <PostHogScreenTracker />
            <ThemeProvider value={navigationTheme}>
              <ReanimatedTrueSheetProvider>
                <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
                <AuthGate />
                <PortalHost />
              </ReanimatedTrueSheetProvider>
            </ThemeProvider>
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

  if (!session) {
    return <SignInScreen />;
  }

  return (
    <TrueSheetNavigator initialRouteName="(tabs)">
      <TrueSheetNavigator.Screen name="(tabs)" />
    </TrueSheetNavigator>
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
