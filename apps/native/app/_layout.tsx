import "@/global.css";

import { getNavigationTheme, getThemeMode } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { SignInScreen } from "@/screens/sign-in-screen";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { PostHogEventProperties } from "@posthog/core";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { StatusBar } from "expo-status-bar";
import { GTProvider } from "gt-react-native";
import { useEffect } from "react";
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

export default function RootLayout() {
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);
  const navigationTheme = getNavigationTheme(theme);
  const selectedTabBackground =
    themeMode === "dark"
      ? `${navigationTheme.colors.primary}24`
      : `${navigationTheme.colors.primary}18`;

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
        <AuthProvider>
          <PostHogScreenTracker />
          <ThemeProvider value={navigationTheme}>
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <AuthGate
              selectedTabBackground={selectedTabBackground}
              tabBackgroundColor={navigationTheme.colors.card}
              tabBlurEffect={themeMode === "dark" ? "systemMaterialDark" : "systemMaterialLight"}
              tabTintColor={navigationTheme.colors.primary}
            />
            <PortalHost />
          </ThemeProvider>
        </AuthProvider>
      </GTProvider>
    </PostHogProvider>
  );
}

function AuthGate({
  selectedTabBackground,
  tabBackgroundColor,
  tabBlurEffect,
  tabTintColor,
}: {
  selectedTabBackground: string;
  tabBackgroundColor: string;
  tabBlurEffect: "systemMaterialDark" | "systemMaterialLight";
  tabTintColor: string;
}) {
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
    <NativeTabs
      backgroundColor={tabBackgroundColor}
      blurEffect={tabBlurEffect}
      disableTransparentOnScrollEdge
      indicatorColor={selectedTabBackground}
      tintColor={tabTintColor}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="gift.fill" md="featured_seasonal_and_gifts" />
        <NativeTabs.Trigger.Label>Wishlists</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
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
