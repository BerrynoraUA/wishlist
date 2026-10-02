import { detailScreenAnimation } from "@/lib/motion";
import { Stack } from "expo-router";

export default function SecretSantaStackLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ animation: detailScreenAnimation }} />
      <Stack.Screen name="join" options={{ animation: detailScreenAnimation }} />
    </Stack>
  );
}
