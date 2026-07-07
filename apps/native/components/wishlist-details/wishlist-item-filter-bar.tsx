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
import {
  ITEM_FILTER_PANEL_HEIGHT,
  SlideOutFilterPanel,
} from "@/components/ui/slide-out-filter-panel";
import { Text } from "@/components/ui/text";
import { PriorityFilterIcon, StatusFilterIcon } from "@/components/items/item-labels";
import { useSettings } from "@/hooks/use-settings";
import {
  DEFAULT_ITEM_SORT,
  getItemPriorityOptions,
  getItemPriority,
  getItemSortOptions,
  getItemStatusOptions,
} from "@/lib/items";
import { cn } from "@/lib/utils";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { ChevronsUpDown, Search, SlidersHorizontal, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { StyleSheet, View } from "react-native";

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const PILL_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 9999 }];

export type WishlistItemFilterState = {
  search: string;
  statuses: string[];
  priorities: string[];
  priceMin: string;
  priceMax: string;
  sort: string;
};

export function wishlistItemFilterBarHasActiveFilters(filters: WishlistItemFilterState) {
  return (
    filters.search.trim() !== "" ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.priceMin.trim() !== "" ||
    filters.priceMax.trim() !== "" ||
    filters.sort !== DEFAULT_ITEM_SORT
  );
}

export function WishlistItemFilterBar({
  filters,
  itemsCount,
  onChange,
  onReset,
  open,
  onOpenChange,
}: {
  filters: WishlistItemFilterState;
  itemsCount: number;
  onChange: (patch: Partial<WishlistItemFilterState>) => void;
  onReset: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const { data: settings } = useSettings();
  const itemSortOptions = React.useMemo(() => getItemSortOptions(t), [t]);
  const itemStatusOptions = React.useMemo(() => getItemStatusOptions(t), [t]);
  const itemPriorityOptions = React.useMemo(
    () => getItemPriorityOptions(t, settings?.selected_priorities),
    [settings?.selected_priorities, t],
  );
  const active = wishlistItemFilterBarHasActiveFilters(filters);
  const selectedSort =
    itemSortOptions.find((option) => option.value === filters.sort)?.label ?? t("Newest first");

  function toggleValue(key: "statuses" | "priorities", value: string) {
    const current = filters[key];
    onChange({
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  }

  const chips = [
    ...filters.statuses.map((value) => ({
      key: `status:${value}`,
      label: itemStatusOptions.find((option) => option.value === value)?.label ?? value,
      onRemove: () => toggleValue("statuses", value),
    })),
    ...filters.priorities.map((value) => ({
      key: `priority:${value}`,
      label: itemPriorityOptions.find((option) => option.value === value)?.label ?? value,
      onRemove: () => toggleValue("priorities", value),
    })),
    ...(filters.priceMin.trim()
      ? [
          {
            key: "priceMin",
            label: t("From {price}", { price: filters.priceMin.trim() }),
            onRemove: () => onChange({ priceMin: "" }),
          },
        ]
      : []),
    ...(filters.priceMax.trim()
      ? [
          {
            key: "priceMax",
            label: t("To {price}", { price: filters.priceMax.trim() }),
            onRemove: () => onChange({ priceMax: "" }),
          },
        ]
      : []),
  ];

  return (
    <View>
      <View className="flex-row items-center justify-between gap-3">
        <Text
          className="min-w-0 flex-1 text-xl font-extrabold tracking-tight text-text"
          numberOfLines={1}
        >
          {itemsCount === 1 ? t("1 Item") : t("{count} Items", { count: itemsCount })}
        </Text>
        <View className="shrink-0 flex-row items-center gap-3">
          {active ? (
            <Button
              variant="destructive"
              size="icon-lg"
              accessibilityLabel={t("Clear filters")}
              onPress={onReset}
              className="shrink-0 rounded-full"
            >
              <Icon as={X} className="size-4 text-white" />
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon-lg"
            accessibilityLabel={t("Show item filters")}
            accessibilityState={{ expanded: open }}
            onPress={() => onOpenChange(!open)}
            className={cn(
              "shrink-0 rounded-full",
              HAS_LIQUID_GLASS
                ? "border-border-subtle bg-transparent dark:bg-transparent"
                : "border-border-subtle bg-card-bg dark:bg-card-bg",
            )}
          >
            {HAS_LIQUID_GLASS ? <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} /> : null}
            <Icon as={SlidersHorizontal} className="size-4 text-text" />
          </Button>
        </View>
      </View>

      <SlideOutFilterPanel open={open} className="pb-1 pt-4" maxHeight={ITEM_FILTER_PANEL_HEIGHT}>
        <View
          className={cn(
            "flex-row items-center gap-1 rounded-full border px-2 pl-3",
            HAS_LIQUID_GLASS
              ? "border-border-subtle bg-transparent"
              : "border-border-subtle bg-card-bg shadow-sm",
          )}
        >
          {HAS_LIQUID_GLASS ? <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} /> : null}
          <Icon as={Search} className="size-4 text-muted-foreground/50" />
          <Input
            value={filters.search}
            onChangeText={(search) => onChange({ search })}
            placeholder={t("Search items...")}
            returnKeyType="search"
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
          />
          {filters.search.length > 0 ? (
            <Button
              variant="ghost"
              size="icon-sm"
              accessibilityLabel={t("Clear search")}
              onPress={() => onChange({ search: "" })}
              className="shrink-0 rounded-full"
            >
              <Icon as={X} className="size-4 text-text-muted" />
            </Button>
          ) : null}
        </View>

        <View className="w-full flex-row items-stretch gap-2">
          <View className="min-w-0 flex-1">
            <MultiSelectMenu
              label={
                filters.statuses.length
                  ? t("{count} statuses", { count: filters.statuses.length })
                  : t("Status")
              }
              values={filters.statuses}
              options={itemStatusOptions.map((option) => ({
                value: option.value,
                label: option.label,
                leading: <StatusFilterIcon status={option.value} />,
              }))}
              onToggle={(value) => toggleValue("statuses", value)}
            />
          </View>
          <View className="min-w-0 flex-1">
            <MultiSelectMenu
              label={
                filters.priorities.length
                  ? t("{count} priorities", { count: filters.priorities.length })
                  : t("Priority")
              }
              values={filters.priorities}
              options={itemPriorityOptions.map((option) => ({
                value: option.value,
                label: option.label,
                color: option.color,
                leading: getItemPriority(option.value) ? (
                  <PriorityFilterIcon priority={getItemPriority(option.value)!} />
                ) : undefined,
              }))}
              onToggle={(value) => toggleValue("priorities", value)}
            />
          </View>
          <View className="min-w-0 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="pill"
                  accessibilityLabel={t("Sort items")}
                  className={cn(
                    "w-full justify-between shadow-none",
                    HAS_LIQUID_GLASS
                      ? "border-border-subtle bg-transparent dark:bg-transparent"
                      : "border-border-subtle bg-card-bg dark:bg-card-bg",
                  )}
                >
                  {HAS_LIQUID_GLASS ? (
                    <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
                  ) : null}
                  <Text className="shrink text-sm font-semibold text-text" numberOfLines={1}>
                    {selectedSort}
                  </Text>
                  <Icon as={ChevronsUpDown} className="size-3.5 shrink-0 text-text" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-52">
                {itemSortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onPress={() => onChange({ sort: option.value })}
                  >
                    <Text>{option.label}</Text>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        </View>

        <View className="w-full flex-row items-center justify-around gap-3">
          <Input
            value={filters.priceMin}
            onChangeText={(priceMin) => onChange({ priceMin })}
            placeholder={t("From")}
            keyboardType="decimal-pad"
            className={cn(
              "h-11 w-[42%] rounded-full border-border-subtle bg-card-bg dark:bg-card-bg",
              filters.priceMin.trim() &&
                "border-brand bg-brand-lighter text-brand dark:bg-brand-lighter",
            )}
          />
          <Input
            value={filters.priceMax}
            onChangeText={(priceMax) => onChange({ priceMax })}
            placeholder={t("To")}
            keyboardType="decimal-pad"
            className={cn(
              "h-11 w-[42%] rounded-full border-border-subtle bg-card-bg dark:bg-card-bg",
              filters.priceMax.trim() &&
                "border-brand bg-brand-lighter text-brand dark:bg-brand-lighter",
            )}
          />
        </View>
      </SlideOutFilterPanel>

      {chips.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {chips.map((chip) => (
            <AnimatedPressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityLabel={t('Remove "{label}" filter', { label: chip.label })}
              onPress={chip.onRemove}
              className="flex-row items-center gap-1 rounded-full bg-brand-lighter px-3 py-1.5"
            >
              <Text className="text-xs font-bold text-brand">{chip.label}</Text>
              <Icon as={X} className="size-3 text-brand" />
            </AnimatedPressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MultiSelectMenu({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: string[];
  options: { value: string; label: string; color?: string; leading?: React.ReactNode }[];
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedPressable
          className={cn(
            "h-11 w-full flex-row items-center justify-between gap-2 rounded-full border px-3",
            values.length > 0
              ? "border-brand bg-brand-lighter"
              : HAS_LIQUID_GLASS
                ? "border-border-subtle bg-transparent"
                : "border-border-subtle bg-card-bg",
          )}
        >
          {values.length === 0 && HAS_LIQUID_GLASS ? (
            <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
          ) : null}
          <Text
            className={cn(
              "shrink text-sm font-semibold text-text",
              values.length > 0 && "text-brand",
            )}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Icon
            as={ChevronsUpDown}
            className={cn("size-3.5 shrink-0 text-text", values.length > 0 && "text-brand")}
          />
        </AnimatedPressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            closeOnPress={false}
            className={option.leading ? "min-h-11 rounded-xl pl-11" : undefined}
            leading={
              option.leading ??
              (option.color ? (
                <View className="size-3 rounded-full" style={{ backgroundColor: option.color }} />
              ) : undefined)
            }
            leadingClassName={option.leading ? "size-7" : undefined}
            onCheckedChange={() => onToggle(option.value)}
          >
            <Text>{option.label}</Text>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
