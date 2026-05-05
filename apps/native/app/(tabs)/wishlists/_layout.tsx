import { Stack } from "expo-router/stack";

export default function WishlistsStackLayout() {
  return (
    <Stack initialRouteName="index">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]"
        options={{
          animation: "fade",
          headerLargeTitle: false,
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      />
    </Stack>
  );
}
