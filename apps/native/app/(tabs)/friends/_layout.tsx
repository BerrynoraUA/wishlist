import { Stack } from "expo-router";

export default function FriendsStackLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ animation: "fade" }} />
      <Stack.Screen name="wishlist/[id]" options={{ animation: "fade" }} />
    </Stack>
  );
}
