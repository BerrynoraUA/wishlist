import "@/global.css";

import { getNavigationTheme, getThemeMode } from "@/lib/theme";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { PostHogEventProperties } from "@posthog/core";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { StatusBar } from "expo-status-bar";
import { GTProvider } from "gt-react-native";
import { useEffect } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
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
          <ThemeProvider value={getNavigationTheme(theme)}>
            <StatusBar style={getThemeMode(theme) === "dark" ? "light" : "dark"} />
            <NativeTabs>
              <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Icon sf="gift.fill" md="featured_seasonal_and_gifts" />
                <NativeTabs.Trigger.Label>Wishlists</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="settings">
                <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
                <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>
            </NativeTabs>
            <PortalHost />
          </ThemeProvider>
        </AuthProvider>
      </GTProvider>
    </PostHogProvider>
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
