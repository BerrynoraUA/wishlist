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
      <Stack.Screen name="[id]" options={{ animation: "fade" }} />
    </Stack>
  );
}
