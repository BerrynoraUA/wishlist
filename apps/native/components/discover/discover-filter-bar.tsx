import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SearchClearButton } from "@/components/ui/search-clear-button";
import { FilterActions } from "@/components/ui/filter-actions";
import { GLASS_PILL_CLASS, HAS_LIQUID_GLASS, PanelPillGlass } from "@/components/ui/liquid-glass";
import { Text } from "@/components/ui/text";
import { PriorityFilterIcon } from "@/components/items/item-labels";
import { useSettings } from "@/hooks/use-settings";
import { getItemPriority, getItemPriorityOptions } from "@/lib/items";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Search } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { type TextInput, View } from "react-native";

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
    <FilterActions
      active={filtersActive}
      open={filtersOpen}
      filterAccessibilityLabel={t("Show filters")}
      clearAccessibilityLabel={t("Clear filters")}
      onOpenChange={onFiltersOpenChange}
      onReset={onResetFilters}
    />
  );
}

/** On iOS 26 the controls sit on liquid glass, like the Wishlists filter panel. */
export function DiscoverFiltersPanel({
  searchInputRef,
  priceMinInputRef,
  priceMaxInputRef,
  open,
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
  /** Whether the panel is open; the glass materializes with it. */
  open: boolean;
  searchInputRef: React.RefObject<TextInput | null>;
  priceMinInputRef: React.RefObject<TextInput | null>;
  priceMaxInputRef: React.RefObject<TextInput | null>;
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
  const sortOptions = [
    { value: "default", label: t("Recommended") },
    { value: "price-low", label: t("Lowest price") },
    { value: "price-high", label: t("Highest price") },
    { value: "priority-high", label: t("Highest priority") },
    { value: "priority-low", label: t("Lowest priority") },
  ];
  const priorityOptions = React.useMemo(
    () => getItemPriorityOptions(t, settings?.selected_priorities),
    [settings?.selected_priorities, t],
  );
  const activePriorityLabels = priorityOptions
    .filter((option) => priorityIds.includes(option.value))
    .map((option) => option.label)
    .join(", ");
  const sortLabel =
    sortOptions.find((option) => option.value === sort)?.label ?? sortOptions[0].label;

  return (
    <View className="gap-3">
      <View
        className={cn(
          "w-full flex-row items-center gap-1 rounded-full ps-3",
          !HAS_LIQUID_GLASS &&
            "border border-border-subtle bg-card-bg shadow-sm android:border-transparent android:bg-bg-muted android:shadow-none",
        )}
      >
        {HAS_LIQUID_GLASS ? <PanelPillGlass open={open} /> : null}
        <Icon as={Search} className="size-4 text-muted-foreground/50" />
        <Input
          ref={searchInputRef}
          value={search}
          onChangeText={onSearchChange}
          placeholder={t("Search gifts or wishlists")}
          className={cn(
            "h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent android:h-12",
            search.length === 0 && "pe-3",
          )}
          returnKeyType="search"
        />
        {search.length > 0 ? <SearchClearButton onPress={() => onSearchChange("")} /> : null}
      </View>

      <View className="w-full flex-row items-stretch gap-2">
        <View className="min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedPressable
                className={cn(
                  "h-11 w-full flex-row items-center justify-between gap-2 rounded-full border px-3 android:h-12 android:overflow-hidden",
                  HAS_LIQUID_GLASS
                    ? GLASS_PILL_CLASS
                    : priorityIds.length > 0
                      ? "border-brand bg-brand-lighter"
                      : "border-border-subtle bg-card-bg",
                )}
              >
                {HAS_LIQUID_GLASS ? <PanelPillGlass open={open} /> : null}
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
                  className="min-h-11 rounded-xl ps-11"
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
                  "h-11 w-full flex-row items-center justify-between gap-2 rounded-full border px-3 android:h-12 android:overflow-hidden",
                  HAS_LIQUID_GLASS
                    ? GLASS_PILL_CLASS
                    : "border-border-subtle bg-card-bg dark:bg-card-bg",
                )}
              >
                {HAS_LIQUID_GLASS ? <PanelPillGlass open={open} /> : null}
                <Text className="shrink text-sm font-semibold text-text" numberOfLines={1}>
                  {sortLabel}
                </Text>
                <Icon as={ChevronsUpDown} className="size-3.5 shrink-0 text-text" />
              </AnimatedPressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-52">
              {sortOptions.map((option) => (
                <DropdownMenuItem key={option.value} onPress={() => onSortChange(option.value)}>
                  <Text>{option.label}</Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>
      </View>

      <View className="flex-row gap-2">
        <PriceInput
          ref={priceMinInputRef}
          open={open}
          value={priceMin}
          onChangeText={onPriceMinChange}
          placeholder={t("Min price")}
        />
        <PriceInput
          ref={priceMaxInputRef}
          open={open}
          value={priceMax}
          onChangeText={onPriceMaxChange}
          placeholder={t("Max price")}
        />
      </View>
    </View>
  );
}

function PriceInput({
  ref,
  open,
  value,
  onChangeText,
  placeholder,
}: {
  ref: React.Ref<TextInput>;
  open: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const active = value.trim() !== "";

  return (
    <View className="min-w-0 flex-1">
      {HAS_LIQUID_GLASS ? <PanelPillGlass open={open} /> : null}
      <Input
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        className={cn(
          "h-11 rounded-full android:h-12 android:shadow-none",
          HAS_LIQUID_GLASS
            ? cn(GLASS_PILL_CLASS, active && "text-brand")
            : active
              ? "border-brand bg-brand-lighter text-brand dark:bg-brand-lighter"
              : "border-border-subtle bg-card-bg dark:bg-card-bg",
        )}
      />
    </View>
  );
}
