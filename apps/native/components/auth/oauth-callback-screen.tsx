import { completeOAuthSessionFromUrl } from "@/api/login";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

export function OAuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const { session } = useAuth();
  const handledUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (session) {
      router.replace("/(tabs)/wishlists" as never);
    }
  }, [router, session]);

  React.useEffect(() => {
    if (!url || handledUrlRef.current === url) return;

    handledUrlRef.current = url;
    void completeOAuthSessionFromUrl(url)
      .then(() => {
        router.replace("/(tabs)/wishlists" as never);
      })
      .catch(() => {
        router.replace("/(auth)/sign-in" as never);
      });
  }, [router, url]);

  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator colorClassName="accent-brand" />
    </View>
  );
}
