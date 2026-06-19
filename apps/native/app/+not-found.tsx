import { useAuth } from "@/providers/auth-provider";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function NotFoundScreen() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center bg-bg">
          <ActivityIndicator colorClassName="accent-brand" />
        </View>
      </>
    );
  }

  return (
    <Redirect href={session ? ("/(tabs)/wishlists" as never) : ("/(auth)/sign-in" as never)} />
  );
}
