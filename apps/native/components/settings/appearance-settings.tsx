import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useUpdateSettings } from "@/hooks/use-settings";
import { ALL_PRIORITIES } from "@wishlist/backend/lib";
import type { ThemePreference, WishlistColorIndex } from "@wishlist/backend/types/settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";
import {
  ChevronDown,
  Gift,
  ListFilter,
  MonitorIcon,
  MoonIcon,
  Palette,
  SunMoon,
  SunIcon,
  type LucideIcon,
} from "lucide-react-native";
import { View } from "react-native";

const THEME_OPTION_HEIGHT = 96;
const SWATCH_OPTION_HEIGHT = 76;

const THEME_PREFERENCES = [
  {
    value: "light" as const,
    label: "Light",
    icon: SunIcon,
  },
  {
    value: "dark" as const,
    label: "Dark",
    icon: MoonIcon,
  },
  {
    value: "system" as const,
    label: "System",
    icon: MonitorIcon,
  },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
  icon: LucideIcon;
}[];

const WISHLIST_ACCENTS = [
  {
    value: WishlistAccent.Pink,
    nativeAccent: "pink",
    label: "Pink",
    className: "bg-gradient-accent-pink",
    selectedBorderClassName: "border-chart-1",
  },
  {
    value: WishlistAccent.Blue,
    nativeAccent: "blue",
    label: "Blue",
    className: "bg-gradient-accent-blue",
    selectedBorderClassName: "border-chart-2",
  },
  {
    value: WishlistAccent.Peach,
    nativeAccent: "peach",
    label: "Peach",
    className: "bg-gradient-accent-peach",
    selectedBorderClassName: "border-chart-3",
  },
  {
    value: WishlistAccent.Mint,
    nativeAccent: "mint",
    label: "Mint",
    className: "bg-gradient-accent-mint",
    selectedBorderClassName: "border-chart-4",
  },
  {
    value: WishlistAccent.Lavender,
    nativeAccent: "lavender",
    label: "Lavender",
    className: "bg-gradient-accent-lavender",
    selectedBorderClassName: "border-chart-5",
  },
] as const satisfies readonly {
  value: WishlistAccent;
  nativeAccent: NativeAccentName;
  label: string;
  className: string;
  selectedBorderClassName: string;
}[];

export function AppearanceSettings({
  selectedTheme,
  selectedAccent,
  selectedWishlistColor,
  selectedPriorities,
  setThemePreference,
}: {
  selectedTheme: ThemePreference;
  selectedAccent: WishlistAccent;
  selectedWishlistColor: WishlistColorIndex;
  selectedPriorities?: string[];
  setThemePreference: (value: ThemePreference) => void;
}) {
  const updateSettings = useUpdateSettings();
  const priorities =
    selectedPriorities ??
    ALL_PRIORITIES.filter((priority) => priority.is_free).map((priority) => priority.id);
  const themeRows = useThemeRows();

  function setDefaultAccent(value: WishlistAccent) {
    updateSettings.mutate({ default_accent: value });
  }

  function togglePriority(id: string) {
    const next = priorities.includes(id)
      ? priorities.filter((priorityId) => priorityId !== id)
      : [...priorities, id];

    if (next.length === 0) return;
    updateSettings.mutate({ selected_priorities: next });
  }

  return (
    <SettingsSection title="Appearance" icon={Palette}>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon as={SunMoon} className="size-4 text-brand" />
          <Text className="text-sm font-semibold text-text">Theme</Text>
        </View>
        <SlidingOptionSelector
          rows={themeRows}
          value={selectedTheme}
          onChange={setThemePreference}
          optionHeight={THEME_OPTION_HEIGHT}
          optionHeightClassName="min-h-24"
          rowClassName="gap-2"
          optionClassName="relative flex-col gap-2 rounded-lg border border-border-light bg-bg-subtle p-3 active:opacity-[0.99]"
          indicatorClassName="rounded-lg border border-brand bg-brand-lighter shadow-brand"
        />
      </View>

      <SwatchPicker
        icon={Palette}
        title="Default Accent Color"
        value={selectedAccent}
        onChange={setDefaultAccent}
      />

      <SwatchPicker
        icon={Gift}
        title="Default Wishlist Color"
        value={selectedWishlistColor}
        onChange={(value) => updateSettings.mutate({ default_wishlist_color: value })}
      />

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon as={ListFilter} className="size-4 text-brand" />
          <Text className="text-sm font-semibold text-text">Item Priorities</Text>
        </View>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 justify-between px-3">
              <Text className="font-semibold text-text">{getPrioritySummary(priorities)}</Text>
              <Icon as={ChevronDown} className="size-4 text-text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72">
            {ALL_PRIORITIES.map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority.id}
                checked={priorities.includes(priority.id)}
                closeOnPress={false}
                disabled={priorities.length === 1 && priorities.includes(priority.id)}
                onCheckedChange={() => togglePriority(priority.id)}
              >
                <View className="flex-row items-center gap-2">
                  <View
                    className="size-3 rounded-full"
                    style={{ backgroundColor: priority.color }}
                  />
                  <Text className="text-sm font-semibold text-popover-foreground">
                    {priority.name}
                  </Text>
                  {!priority.is_free && <Text className="text-xs font-bold text-brand">Pro</Text>}
                </View>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </View>
    </SettingsSection>
  );
}

function getPrioritySummary(priorityIds: string[]) {
  const selectedNames = ALL_PRIORITIES.filter((priority) => priorityIds.includes(priority.id)).map(
    (priority) => priority.name,
  );

  if (selectedNames.length <= 2) {
    return selectedNames.join(", ");
  }

  return `${selectedNames.length} priorities selected`;
}

function useThemeRows(): SlidingOption<ThemePreference>[][] {
  return [
    THEME_PREFERENCES.map((theme) => {
      const IconComponent = theme.icon;

      return {
        value: theme.value,
        accessibilityLabel: `${theme.label} theme`,
        children: ({ selected }: SlidingOptionRenderProps) => (
          <>
            <View
              className={cn(
                "size-10 items-center justify-center rounded-full bg-bg-muted",
                selected && "bg-gradient-brand-subtle",
              )}
            >
              <Icon
                as={IconComponent}
                className={cn("size-5 text-text", selected && "text-brand")}
              />
            </View>
            <Text className={cn("text-sm font-bold text-text", selected && "text-brand")}>
              {theme.label}
            </Text>
          </>
        ),
      };
    }),
  ];
}

function SwatchPicker<T extends WishlistAccent | WishlistColorIndex>({
  icon,
  title,
  value,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  value: T;
  onChange: (value: T) => void;
}) {
  const selectedAccent =
    WISHLIST_ACCENTS.find((accent) => accent.value === value) ?? WISHLIST_ACCENTS[0];

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon as={icon} className="size-4 text-brand" />
        <Text className="text-sm font-semibold text-text">{title}</Text>
      </View>
      <SlidingOptionSelector
        rows={[WISHLIST_ACCENTS.map((accent) => createSwatchOption<T>(accent))]}
        value={value}
        onChange={onChange}
        optionHeight={SWATCH_OPTION_HEIGHT}
        optionHeightClassName="h-[76px]"
        rowClassName="gap-1"
        optionClassName="flex-col items-center justify-center border-0 bg-transparent px-0.5 py-0 shadow-none"
        indicatorClassName={cn(
          "rounded-xl border bg-brand-lighter/35 shadow-sm shadow-brand/20",
          selectedAccent.selectedBorderClassName,
        )}
      />
    </View>
  );
}

function createSwatchOption<T extends WishlistAccent | WishlistColorIndex>(
  accent: (typeof WISHLIST_ACCENTS)[number],
): SlidingOption<T> {
  return {
    value: accent.value as T,
    accessibilityLabel: accent.label,
    surfaceClassName: "bg-transparent",
    children: () => (
      <View className="w-full items-center gap-1 py-1.5">
        <View
          className={cn("size-11 items-center justify-center rounded-full", accent.className)}
        />
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
