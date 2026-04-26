import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  getNativeThemeName,
  getThemeAccent,
  getThemeMode,
  NATIVE_ACCENTS,
  type NativeAccentName,
  type NativeThemeMode,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Stack } from "expo-router";
import { CheckIcon, MoonIcon, SunIcon } from "lucide-react-native";
import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Uniwind, useUniwind } from "uniwind";

const MODE_OPTIONS = [
  {
    mode: "light",
    label: "Light",
    icon: SunIcon,
  },
  {
    mode: "dark",
    label: "Dark",
    icon: MoonIcon,
  },
] as const satisfies readonly {
  mode: NativeThemeMode;
  label: string;
  icon: typeof SunIcon;
}[];

export default function SettingsScreen() {
  const { theme } = useUniwind();
  const activeMode = getThemeMode(theme);
  const activeAccent = getThemeAccent(theme);

  function setMode(mode: NativeThemeMode) {
    Uniwind.setTheme(getNativeThemeName(mode, activeAccent));
  }

  function setAccent(accent: NativeAccentName) {
    Uniwind.setTheme(getNativeThemeName(activeMode, accent));
  }

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerClassName="gap-5 px-4 pb-safe-offset-6 pt-6"
      >
        <SettingsSection title="Theme">
          <View className="flex-row gap-3">
            {MODE_OPTIONS.map((option) => (
              <ThemeModeButton
                key={option.mode}
                option={option}
                isActive={activeMode === option.mode}
                onPress={() => setMode(option.mode)}
              />
            ))}
          </View>
        </SettingsSection>

        <SettingsSection title="Accent">
          <View className="flex-row flex-wrap justify-around gap-x-4 gap-y-5 px-1">
            {NATIVE_ACCENTS.map((accent) => {
              const isActive = activeAccent === accent.name;

              return (
                <Pressable
                  key={accent.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Use ${accent.label} accent`}
                  onPress={() => setAccent(accent.name)}
                  className="items-center gap-2"
                >
                  <View
                    className={cn(
                      "size-12 items-center justify-center rounded-full border-2 border-transparent",
                      accent.swatchClassName,
                      isActive && "border-brand shadow-brand",
                    )}
                  >
                    {isActive ? <Icon as={CheckIcon} className="size-5 text-text" /> : null}
                  </View>
                  <Text
                    className={cn("text-body font-semibold text-text", isActive && "text-brand")}
                  >
                    {accent.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsSection>
      </ScrollView>
    </>
  );
}

function ThemeModeButton({
  option,
  isActive,
  onPress,
}: {
  option: (typeof MODE_OPTIONS)[number];
  isActive: boolean;
  onPress: () => void;
}) {
  const selectedProgress = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    selectedProgress.value = withTiming(isActive ? 1 : 0, { duration: 220 });
  }, [isActive, selectedProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.9 + selectedProgress.value * 0.1,
    transform: [{ scale: 0.98 + selectedProgress.value * 0.02 }],
  }));

  return (
    <Animated.View className="flex-1" style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        onPress={onPress}
        className={cn(
          "relative min-h-28 flex-1 items-center justify-center gap-2 rounded-lg border border-border-light bg-bg-subtle p-4 active:scale-[0.99]",
          isActive && "border-brand bg-brand-lighter shadow-brand",
        )}
      >
        <View
          className={cn(
            "size-11 items-center justify-center rounded-full bg-bg-muted",
            isActive && "bg-gradient-brand-subtle",
          )}
        >
          <Icon as={option.icon} className={cn("size-5 text-text", isActive && "text-brand")} />
        </View>
        <Text className="text-body font-bold text-text">{option.label}</Text>
        {isActive ? <ActiveCheck /> : null}
      </Pressable>
    </Animated.View>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-4 rounded-xl border border-border-subtle bg-card-bg p-5 shadow-sm">
      <Text className="text-title font-bold text-text">{title}</Text>
      {children}
    </View>
  );
}

function ActiveCheck() {
  return (
    <View className="absolute right-3 top-3 size-6 items-center justify-center rounded-full bg-brand">
      <Icon as={CheckIcon} className="size-3.5 text-white" />
    </View>
  );
}
