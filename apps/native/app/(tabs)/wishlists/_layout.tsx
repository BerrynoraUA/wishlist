import { detailScreenAnimation } from "@/lib/motion";
import { Stack } from "expo-router";

export default function WishlistsStackLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="discover" options={{ animation: detailScreenAnimation }} />
      <Stack.Screen name="[id]" options={{ animation: detailScreenAnimation }} />
    </Stack>
  );
}
