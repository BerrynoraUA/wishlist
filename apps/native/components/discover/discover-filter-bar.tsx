import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { PriorityFilterIcon } from "@/components/items/item-labels";
import { useSettings } from "@/hooks/use-settings";
import { getItemPriority, getItemPriorityOptions } from "@/lib/items";
import { cn } from "@/lib/utils";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { ChevronsUpDown, SlidersHorizontal, Search, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { StyleSheet, View } from "react-native";

const SORT_OPTIONS = [
  { value: "default", labelKey: "Recommended" },
  { value: "price-low", labelKey: "Lowest price" },
  { value: "price-high", labelKey: "Highest price" },
  { value: "priority-high", labelKey: "Highest priority" },
  { value: "priority-low", labelKey: "Lowest priority" },
] as const;
const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const PILL_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 9999 }];

export function DiscoverFilterActions({
  filtersOpen,
  filtersActive,
  onFiltersOpenChange,
  onResetFilters,
}: {
  filtersOpen: boolean;
  filtersActive: boolean;
  onFiltersOpenChange: (value: boolean) => void;
  onResetFilters: () => void;
}) {
  const t = useGT();

  return (
    <View className="flex-row items-center gap-2">
      {filtersActive ? (
        <Button
          variant="destructive"
          size="icon"
          accessibilityLabel={t("Clear filters")}
          onPress={onResetFilters}
          className="h-11 w-11 shrink-0 rounded-full"
        >
          <Icon as={X} className="size-4 text-white" />
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="lg"
        accessibilityLabel={t("Show filters")}
        accessibilityState={{ expanded: filtersOpen }}
        onPress={() => onFiltersOpenChange(!filtersOpen)}
        className={cn(
          "h-11 w-11 min-w-11 shrink-0 rounded-full p-0",
          filtersOpen
            ? "border-brand bg-brand-lighter dark:bg-brand-lighter"
            : HAS_LIQUID_GLASS
              ? "border-transparent bg-transparent dark:bg-transparent"
              : "border-border-subtle bg-card-bg shadow-sm dark:bg-card-bg",
        )}
      >
        {!filtersOpen && HAS_LIQUID_GLASS ? (
          <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
        ) : null}
        <Icon
          as={SlidersHorizontal}
          className={cn("size-4 text-text", filtersOpen && "text-brand")}
        />
      </Button>
    </View>
  );
}

export function DiscoverFiltersPanel({
  search,
  priorityIds,
  priceMin,
  priceMax,
  sort,
  onSearchChange,
  onPriorityToggle,
  onPriceMinChange,
  onPriceMaxChange,
  onSortChange,
}: {
  search: string;
  priorityIds: string[];
  priceMin: string;
  priceMax: string;
  sort: string;
  onSearchChange: (value: string) => void;
  onPriorityToggle: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  const t = useGT();
  const { data: settings } = useSettings();
  const priorityOptions = React.useMemo(
    () => getItemPriorityOptions(t, settings?.selected_priorities),
    [settings?.selected_priorities, t],
  );
  const activePriorityLabels = priorityOptions
    .filter((option) => priorityIds.includes(option.value))
    .map((option) => option.label)
    .join(", ");
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sort)?.labelKey ?? SORT_OPTIONS[0].labelKey;

  return (
    <View className="gap-3">
      <View
        className={cn(
          "w-full flex-row items-center gap-1 rounded-full border px-2 pl-3",
          HAS_LIQUID_GLASS
            ? "border-transparent bg-transparent"
            : "border-border-subtle bg-card-bg shadow-sm",
        )}
      >
        {HAS_LIQUID_GLASS ? <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} /> : null}
        <Icon as={Search} className="size-4 text-muted-foreground/50" />
        <Input
          value={search}
          onChangeText={onSearchChange}
          placeholder={t("Search gifts or wishlists")}
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel={t("Clear search")}
            onPress={() => onSearchChange("")}
            className="size-9 shrink-0 rounded-full"
          >
            <Icon as={X} className="size-4 text-text-muted" />
          </Button>
        ) : null}
      </View>

      <View className="w-full flex-row items-stretch gap-2">
        <View className="min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedPressable
                className={cn(
                  "h-11 w-full flex-row items-center justify-between gap-2 rounded-full border px-3",
                  priorityIds.length > 0
                    ? "border-brand bg-brand-lighter"
                    : HAS_LIQUID_GLASS
                      ? "border-transparent bg-transparent"
                      : "border-border-subtle bg-card-bg",
                )}
              >
                {priorityIds.length === 0 && HAS_LIQUID_GLASS ? (
                  <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
                ) : null}
                <Text
                  className={cn(
                    "shrink text-sm font-semibold text-text",
                    priorityIds.length > 0 && "text-brand",
                  )}
                  numberOfLines={1}
                >
                  {activePriorityLabels || t("Priority")}
                </Text>
                <Icon
                  as={ChevronsUpDown}
                  className={cn(
                    "size-3.5 shrink-0 text-text",
                    priorityIds.length > 0 && "text-brand",
                  )}
                />
              </AnimatedPressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-48">
              {priorityOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={priorityIds.includes(option.value)}
                  closeOnPress={false}
                  className="min-h-11 rounded-xl pl-11"
                  leading={
                    getItemPriority(option.value) ? (
                      <PriorityFilterIcon priority={getItemPriority(option.value)!} />
                    ) : undefined
                  }
                  leadingClassName="size-7"
                  onCheckedChange={() => onPriorityToggle(option.value)}
                >
                  <Text>{option.label}</Text>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>

        <View className="min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedPressable
                className={cn(
                  "h-11 w-full flex-row items-center justify-between gap-2 rounded-full border px-3",
                  HAS_LIQUID_GLASS
                    ? "border-transparent bg-transparent dark:bg-transparent"
                    : "border-border-subtle bg-card-bg dark:bg-card-bg",
                )}
              >
                {HAS_LIQUID_GLASS ? (
                  <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
                ) : null}
                <Text className="shrink text-sm font-semibold text-text" numberOfLines={1}>
                  {t(sortLabel)}
                </Text>
                <Icon as={ChevronsUpDown} className="size-3.5 shrink-0 text-text" />
              </AnimatedPressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-52">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.value} onPress={() => onSortChange(option.value)}>
                  <Text>{t(option.labelKey)}</Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Input
          value={priceMin}
          onChangeText={onPriceMinChange}
          keyboardType="decimal-pad"
          placeholder={t("Min price")}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-full border-border-subtle bg-card-bg dark:bg-card-bg",
            priceMin.trim() && "border-brand bg-brand-lighter text-brand dark:bg-brand-lighter",
          )}
        />
        <Input
          value={priceMax}
          onChangeText={onPriceMaxChange}
          keyboardType="decimal-pad"
          placeholder={t("Max price")}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-full border-border-subtle bg-card-bg dark:bg-card-bg",
            priceMax.trim() && "border-brand bg-brand-lighter text-brand dark:bg-brand-lighter",
          )}
        />
      </View>
    </View>
  );
}
