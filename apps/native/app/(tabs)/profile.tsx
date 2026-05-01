import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  SlidingOptionSelector,
  type SlidingOption,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
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
import { useAuth } from "@/providers/auth-provider";
import { Stack } from "expo-router";
import { CheckIcon, LogOut, MoonIcon, SunIcon } from "lucide-react-native";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

const THEME_ROW_HEIGHT = 112;

const THEME_MODE_ROWS = [
  [
    {
      value: "light" as const,
      accessibilityLabel: "Light theme",
      children: ({ selected }: SlidingOptionRenderProps) => (
        <>
          <View
            className={cn(
              "size-11 items-center justify-center rounded-full bg-bg-muted",
              selected && "bg-gradient-brand-subtle",
            )}
          >
            <Icon as={SunIcon} className={cn("size-5 text-text", selected && "text-brand")} />
          </View>
          <Text className="text-body font-bold text-text">Light</Text>
          {selected ? <ActiveCheck /> : null}
        </>
      ),
    },
    {
      value: "dark" as const,
      accessibilityLabel: "Dark theme",
      children: ({ selected }: SlidingOptionRenderProps) => (
        <>
          <View
            className={cn(
              "size-11 items-center justify-center rounded-full bg-bg-muted",
              selected && "bg-gradient-brand-subtle",
            )}
          >
            <Icon as={MoonIcon} className={cn("size-5 text-text", selected && "text-brand")} />
          </View>
          <Text className="text-body font-bold text-text">Dark</Text>
          {selected ? <ActiveCheck /> : null}
        </>
      ),
    },
  ],
] satisfies SlidingOption<NativeThemeMode>[][];

/** Swatch + gap + label + vertical padding; matches SlidingOptionSelector indicator height */
const ACCENT_CELL_HEIGHT_PX = 76;
const ACCENT_CELL_HEIGHT_CLASS = "h-[76px]";

export default function ProfileScreen() {
  const { theme } = useUniwind();
  const { signOut } = useAuth();
  const activeMode = getThemeMode(theme);
  const activeAccent = getThemeAccent(theme);

  const accentRows = React.useMemo((): SlidingOption<NativeAccentName>[][] => {
    const options = NATIVE_ACCENTS.map((accent) => ({
      value: accent.name,
      accessibilityLabel: `Use ${accent.label} accent`,
      children: ({ selected }: SlidingOptionRenderProps) => (
        <View className="w-full items-center gap-1 py-1.5">
          <View
            className={cn(
              "size-11 items-center justify-center rounded-full border-2 border-transparent",
              accent.swatchClassName,
            )}
          >
            {selected ? <Icon as={CheckIcon} className="size-4 text-text" /> : null}
          </View>
          <Text
            className={cn(
              "text-center text-[11px] font-semibold leading-tight text-text",
              selected && "text-brand",
            )}
            numberOfLines={1}
          >
            {accent.label}
          </Text>
        </View>
      ),
    }));

    return [options];
  }, []);

  function setMode(mode: NativeThemeMode) {
    Uniwind.setTheme(getNativeThemeName(mode, activeAccent));
  }

  function setAccent(accent: NativeAccentName) {
    Uniwind.setTheme(getNativeThemeName(activeMode, accent));
  }

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <View className="flex-1 bg-bg">
        <ScrollView className="flex-1" contentContainerClassName="gap-5 px-4 pb-2 pt-6">
          <SettingsSection title="Theme">
            <SlidingOptionSelector
              rows={THEME_MODE_ROWS}
              value={activeMode}
              onChange={setMode}
              optionHeight={THEME_ROW_HEIGHT}
              optionHeightClassName="min-h-28"
              rowClassName="gap-3"
              optionClassName="relative flex-col gap-2 rounded-lg border border-border-light bg-bg-subtle p-4 active:opacity-[0.99]"
              indicatorClassName="rounded-lg border border-brand bg-brand-lighter shadow-brand"
            />
          </SettingsSection>

          <SettingsSection title="Accent">
            <SlidingOptionSelector
              rows={accentRows}
              value={activeAccent}
              onChange={setAccent}
              optionHeight={ACCENT_CELL_HEIGHT_PX}
              optionHeightClassName={ACCENT_CELL_HEIGHT_CLASS}
              rowClassName="gap-1"
              optionClassName="flex-col items-center justify-center border-0 bg-transparent px-0.5 py-0 shadow-none"
              indicatorClassName="rounded-xl border border-brand bg-brand-lighter/35 shadow-sm shadow-brand/20"
            />
          </SettingsSection>
        </ScrollView>

        <View className="border-t border-border-subtle bg-bg px-4 pb-safe-offset-4 pt-3">
          <Button
            variant="outline"
            className="h-12 w-full border-destructive/50 active:bg-destructive/5"
            onPress={() => void signOut()}
          >
            <Icon as={LogOut} className="size-4 text-destructive" />
            <Text className="text-sm font-semibold text-destructive">Log out</Text>
          </Button>
        </View>
      </View>
    </>
  );
}

function ActiveCheck() {
  return (
    <View className="absolute right-3 top-3 size-6 items-center justify-center rounded-full bg-brand">
      <Icon as={CheckIcon} className="size-3.5 text-white" />
    </View>
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
