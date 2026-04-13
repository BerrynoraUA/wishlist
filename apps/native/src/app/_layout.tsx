import "@/polyfills/gtIntlPolyfills";
import type { PostHogEventProperties } from "@posthog/core";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { GTProvider } from "gt-react-native";
import gtConfig from "../../gt.config.json";
import { loadTranslations } from "@/loadTranslations";
import { AuthProvider } from "@/providers/auth-provider";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const posthogHost = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(
  /\/+$/,
  "",
);
const posthogEnabled = Boolean(posthogApiKey);

export default function RootLayout() {
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
        loadTranslations={loadTranslations}
        projectId={process.env.EXPO_PUBLIC_GT_PROJECT_ID}
        devApiKey={process.env.EXPO_PUBLIC_GT_DEV_API_KEY}
        renderSettings={{
          method: "skeleton",
        }}
      >
        <AuthProvider>
          <PostHogScreenTracker />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
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
