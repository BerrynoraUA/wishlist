import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getThemeMode } from "@/lib/theme";
import { Link, Stack } from "expo-router";
import { MoonStarIcon, SettingsIcon, StarIcon, SunIcon } from "lucide-react-native";
import * as React from "react";
import { Image, type ImageStyle, View } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

const LOGO = {
  light: require("@/assets/images/react-native-reusables-light.png"),
  dark: require("@/assets/images/react-native-reusables-dark.png"),
};

const SCREEN_OPTIONS = {
  title: "React Native Reusables",
  headerTransparent: true,
  headerRight: () => <ThemeToggle />,
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export default function Screen() {
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 items-center justify-center gap-8 p-4">
        <Image source={LOGO[themeMode]} style={IMAGE_STYLE} resizeMode="contain" />
        <View className="flex-row gap-2">
          <Link href="https://reactnativereusables.com" asChild>
            <Button>
              <Text>Browse the Docs</Text>
            </Button>
          </Link>
          <Link href="https://github.com/founded-labs/react-native-reusables" asChild>
            <Button variant="ghost">
              <Text>Star the Repo</Text>
              <Icon as={StarIcon} />
            </Button>
          </Link>
        </View>
        <Link href="/settings" asChild>
          <Button variant="outline" className="rounded-full">
            <Icon as={SettingsIcon} />
            <Text>Open Settings</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { theme } = useUniwind();
  const themeMode = getThemeMode(theme);

  function toggleTheme() {
    const newTheme = themeMode === "dark" ? "light" : "dark";
    Uniwind.setTheme(newTheme);
  }

  return (
    <Button
      onPressIn={toggleTheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 web:mx-4 rounded-full"
    >
      <Icon as={THEME_ICONS[themeMode]} className="size-5" />
    </Button>
  );
}
