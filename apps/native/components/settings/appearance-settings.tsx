import { Icon } from "@/components/ui/icon";
import {
  SlidingOptionSelector,
  type SlidingOption,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import { Text } from "@/components/ui/text";
import { SettingsSection } from "@/components/settings/settings-section";
import type { NativeAccentName } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { getWishlistAccentOptions } from "@/lib/wishlists";
import { useUpdateSettings } from "@/hooks/use-settings";
import { useProGate } from "@/hooks/use-pro-gate";
import type { ThemePreference, WishlistColorIndex } from "@wishlist/backend/types/settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";
import {
  Gift,
  MonitorIcon,
  MoonIcon,
  Palette,
  SunMoon,
  SunIcon,
  type LucideIcon,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";
import { Lock } from "lucide-react-native";

const THEME_OPTION_HEIGHT = 96;
const SWATCH_OPTION_HEIGHT = 76;

const THEME_DEFINITIONS = [
  { value: "light" as const, icon: SunIcon },
  { value: "dark" as const, icon: MoonIcon },
  { value: "system" as const, icon: MonitorIcon },
];

const SWATCH_META = [
  {
    value: WishlistAccent.Pink,
    nativeAccent: "pink",
    className: "bg-linear-135 from-pink-300 via-pink-400 to-pink-600",
    selectedBorderClassName: "border-chart-1",
  },
  {
    value: WishlistAccent.Blue,
    nativeAccent: "blue",
    className: "bg-linear-135 from-sky-300 via-blue-400 to-blue-600",
    selectedBorderClassName: "border-chart-2",
  },
  {
    value: WishlistAccent.Peach,
    nativeAccent: "peach",
    className: "bg-linear-135 from-amber-200 via-orange-300 to-amber-500",
    selectedBorderClassName: "border-chart-3",
  },
  {
    value: WishlistAccent.Mint,
    nativeAccent: "mint",
    className: "bg-linear-135 from-emerald-200 via-teal-300 to-emerald-500",
    selectedBorderClassName: "border-chart-4",
  },
  {
    value: WishlistAccent.Lavender,
    nativeAccent: "lavender",
    className: "bg-linear-135 from-violet-200 via-purple-300 to-violet-500",
    selectedBorderClassName: "border-chart-5",
  },
] as const satisfies readonly {
  value: WishlistAccent;
  nativeAccent: NativeAccentName;
  className: string;
  selectedBorderClassName: string;
}[];

export function AppearanceSettings({
  selectedTheme,
  selectedAccent,
  selectedWishlistColor,
  setThemePreference,
}: {
  selectedTheme: ThemePreference;
  selectedAccent: WishlistAccent;
  selectedWishlistColor: WishlistColorIndex;
  setThemePreference: (value: ThemePreference) => void;
}) {
  const t = useGT();
  const updateSettings = useUpdateSettings();
  const { isPro, openPaywall } = useProGate();

  const accentOptions = React.useMemo(() => getWishlistAccentOptions(t), [t]);
  const accentsWithLabels = React.useMemo(
    (): SwatchRow[] =>
      SWATCH_META.map((meta, index) => ({
        ...meta,
        label: accentOptions[index]?.label ?? "",
      })),
    [accentOptions],
  );

  const themeRows = React.useMemo(
    () => [
      THEME_DEFINITIONS.map((themeDef) => {
        const label =
          themeDef.value === "light"
            ? t("Light")
            : themeDef.value === "dark"
              ? t("Dark")
              : t("System");
        const IconComponent = themeDef.icon;

        return {
          value: themeDef.value,
          accessibilityLabel: t("{mode} theme", { mode: label }),
          children: ({ selected }: SlidingOptionRenderProps) => (
            <>
              <View
                className={cn(
                  "size-10 items-center justify-center rounded-full bg-bg-muted",
                  selected && "bg-linear-135 from-brand-lighter via-accent to-secondary",
                )}
              >
                <Icon
                  as={IconComponent}
                  className={cn("size-5 text-text", selected && "text-brand")}
                />
              </View>
              <Text className={cn("text-sm font-bold text-text", selected && "text-brand")}>
                {label}
              </Text>
            </>
          ),
        };
      }),
    ],
    [t],
  );

  function setDefaultAccent(value: WishlistAccent) {
    if (!isPro && value !== WishlistAccent.Pink) {
      openPaywall();
      return;
    }
    updateSettings.mutate({ default_accent: value });
  }

  return (
    <SettingsSection id="appearance" title={t("Appearance")} icon={Palette}>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon as={SunMoon} className="size-4 text-brand" />
          <Text className="text-sm font-semibold text-text">{t("Theme")}</Text>
        </View>
        <SlidingOptionSelector
          rows={themeRows}
          value={selectedTheme}
          onChange={setThemePreference}
          optionHeight={THEME_OPTION_HEIGHT}
          optionHeightClassName="min-h-24"
          rowClassName="gap-2"
          optionClassName="relative flex-col gap-2 rounded-lg border border-border-light bg-bg-subtle p-3 active:opacity-99"
          indicatorClassName="rounded-lg border border-brand bg-brand-lighter shadow-brand"
        />
      </View>

      <SwatchPicker
        icon={Palette}
        accents={accentsWithLabels}
        title={t("Default Accent Color")}
        value={selectedAccent}
        onChange={setDefaultAccent}
        isLocked={(value) => !isPro && value !== WishlistAccent.Pink}
      />

      <SwatchPicker
        icon={Gift}
        accents={accentsWithLabels}
        title={t("Default Wishlist Color")}
        value={selectedWishlistColor}
        onChange={(value) => {
          if (!isPro && value !== 0) {
            openPaywall();
            return;
          }
          updateSettings.mutate({ default_wishlist_color: value });
        }}
        isLocked={(value) => !isPro && value !== 0}
        getValue={(_, index) => index as WishlistColorIndex}
      />
    </SettingsSection>
  );
}

type SwatchRow = (typeof SWATCH_META)[number] & { label: string };

function SwatchPicker<T extends WishlistAccent | WishlistColorIndex>({
  icon,
  title,
  accents,
  value,
  onChange,
  isLocked,
  getValue,
}: {
  icon: LucideIcon;
  title: string;
  accents: SwatchRow[];
  value: T;
  onChange: (value: T) => void;
  isLocked?: (value: T) => boolean;
  getValue?: (accent: SwatchRow, index: number) => T;
}) {
  const optionValue = (accent: SwatchRow, index: number) =>
    getValue?.(accent, index) ?? (accent.value as T);
  const selectedAccent =
    accents.find((accent, index) => optionValue(accent, index) === value) ?? accents[0];

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon as={icon} className="size-4 text-brand" />
        <Text className="text-sm font-semibold text-text">{title}</Text>
      </View>
      <SlidingOptionSelector
        rows={[
          accents.map((accent, index) => {
            const accentValue = optionValue(accent, index);
            return createSwatchOption(accent, accentValue, isLocked?.(accentValue));
          }),
        ]}
        value={value}
        onChange={onChange}
        optionHeight={SWATCH_OPTION_HEIGHT}
        optionHeightClassName="h-19"
        rowClassName="gap-1"
        optionClassName="flex-col items-center justify-center border-0 bg-transparent px-0 py-0 shadow-none"
        indicatorClassName={cn(
          "rounded-xl border bg-brand-lighter/35 shadow-sm shadow-brand/20",
          selectedAccent.selectedBorderClassName,
        )}
      />
    </View>
  );
}

function createSwatchOption<T extends WishlistAccent | WishlistColorIndex>(
  accent: SwatchRow,
  value: T,
  locked = false,
): SlidingOption<T> {
  return {
    value,
    accessibilityLabel: accent.label,
    surfaceClassName: "bg-transparent",
    children: () => (
      <View className={cn("w-full items-center gap-1 py-1.5", locked && "opacity-55")}>
        <View className={cn("size-11 items-center justify-center rounded-full", accent.className)}>
          {locked ? <Icon as={Lock} className="size-4 text-white" /> : null}
        </View>
        <Text
          className="text-center text-[11px] font-semibold leading-tight text-text"
          numberOfLines={1}
        >
          {accent.label}
        </Text>
      </View>
    ),
  };
}
