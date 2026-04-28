import { Stack } from "expo-router";

export default function WishlistsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[id]" options={{ animation: "fade" }} />
    </Stack>
  );
}
