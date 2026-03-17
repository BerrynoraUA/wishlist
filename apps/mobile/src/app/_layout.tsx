import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/providers";

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="dark" />
      <Slot />
    </Providers>
  );
}
