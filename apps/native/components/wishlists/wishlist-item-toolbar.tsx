import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { BouncingButton } from "@/components/ui/buttons/BouncingButton";
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
import {
  DEFAULT_ITEM_SORT,
  ITEM_PRIORITY_OPTIONS,
  ITEM_SORT_OPTIONS,
  ITEM_STATUS_OPTIONS,
} from "@/lib/items";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Plus, Search, SlidersHorizontal, X } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

export type WishlistItemFilterState = {
  search: string;
  statuses: string[];
  priorities: string[];
  priceMin: string;
  priceMax: string;
  sort: string;
};

export function hasWishlistItemFilters(filters: WishlistItemFilterState) {
  return (
    filters.search.trim() !== "" ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.priceMin.trim() !== "" ||
    filters.priceMax.trim() !== "" ||
    filters.sort !== DEFAULT_ITEM_SORT
  );
}

export function WishlistItemToolbar({
  filters,
  onChange,
  onReset,
  onAddItem,
}: {
  filters: WishlistItemFilterState;
  onChange: (patch: Partial<WishlistItemFilterState>) => void;
  onReset: () => void;
  onAddItem?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const active = hasWishlistItemFilters(filters);
  const selectedSort =
    ITEM_SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? "Newest first";

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
      label: ITEM_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value,
      onRemove: () => toggleValue("statuses", value),
    })),
    ...filters.priorities.map((value) => ({
      key: `priority:${value}`,
      label: ITEM_PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? value,
      onRemove: () => toggleValue("priorities", value),
    })),
    ...(filters.priceMin.trim()
      ? [
          {
            key: "priceMin",
            label: `From ${filters.priceMin.trim()}`,
            onRemove: () => onChange({ priceMin: "" }),
          },
        ]
      : []),
    ...(filters.priceMax.trim()
      ? [
          {
            key: "priceMax",
            label: `To ${filters.priceMax.trim()}`,
            onRemove: () => onChange({ priceMax: "" }),
          },
        ]
      : []),
  ];

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="text-xl font-extrabold tracking-tight text-text">Items</Text>
          <Button
            variant="outline"
            size="lg"
            accessibilityLabel="Show item filters"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((current) => !current)}
            className={cn(
              "h-11 w-11 min-w-11 shrink-0 rounded-full border-border-subtle bg-card-bg p-0 sm:h-11 sm:w-11 sm:min-w-11",
              open && "border-brand bg-brand-lighter",
            )}
          >
            <Icon as={SlidersHorizontal} className={cn("size-4 text-text", open && "text-brand")} />
          </Button>
          {active ? (
            <Button
              variant="destructive"
              size="icon"
              accessibilityLabel="Clear filters"
              onPress={onReset}
              className="h-11 w-11 shrink-0 rounded-full"
            >
              <Icon as={X} className="size-4 text-white" />
            </Button>
          ) : null}
        </View>
        {onAddItem ? (
          <BouncingButton
            accessibilityLabel="Add item"
            Icon={<Icon as={Plus} className="size-4 text-primary-foreground" />}
            onPress={onAddItem}
            title="Add Item"
          />
        ) : null}
      </View>

      {open ? (
        <View className="gap-3">
          <View className="flex-row items-center gap-1 rounded-full border border-border-subtle bg-card-bg px-2 pl-3 shadow-sm">
            <Icon as={Search} className="size-4 text-text-muted" />
            <Input
              value={filters.search}
              onChangeText={(search) => onChange({ search })}
              placeholder="Search items..."
              returnKeyType="search"
              className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none"
            />
            {filters.search.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel="Clear search"
                onPress={() => onChange({ search: "" })}
                className="size-9 shrink-0 rounded-full"
              >
                <Icon as={X} className="size-4 text-text-muted" />
              </Button>
            ) : null}
          </View>

          <View className="w-full flex-row items-stretch gap-2">
            <View className="min-w-0 flex-1">
              <MultiSelectMenu
                label={filters.statuses.length ? `${filters.statuses.length} statuses` : "Status"}
                values={filters.statuses}
                options={ITEM_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onToggle={(value) => toggleValue("statuses", value)}
              />
            </View>
            <View className="min-w-0 flex-1">
              <MultiSelectMenu
                label={
                  filters.priorities.length ? `${filters.priorities.length} priorities` : "Priority"
                }
                values={filters.priorities}
                options={ITEM_PRIORITY_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onToggle={(value) => toggleValue("priorities", value)}
              />
            </View>
            <View className="min-w-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AnimatedPressable className="h-10 w-full flex-row items-center justify-between gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
                    <Text className="shrink text-sm font-semibold text-text" numberOfLines={1}>
                      {selectedSort}
                    </Text>
                    <Icon as={ChevronsUpDown} className="size-3.5 shrink-0 text-text-muted" />
                  </AnimatedPressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-52">
                  {ITEM_SORT_OPTIONS.map((option) => (
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
              placeholder="From"
              keyboardType="decimal-pad"
              className="h-10 w-[42%] rounded-full"
            />
            <Input
              value={filters.priceMax}
              onChangeText={(priceMax) => onChange({ priceMax })}
              placeholder="To"
              keyboardType="decimal-pad"
              className="h-10 w-[42%] rounded-full"
            />
          </View>
        </View>
      ) : null}

      {chips.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {chips.map((chip) => (
            <AnimatedPressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${chip.label} filter`}
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
  options: { value: string; label: string }[];
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedPressable
          className={cn(
            "h-10 w-full flex-row items-center justify-between gap-2 rounded-full border border-border-subtle bg-card-bg px-3",
            values.length > 0 && "border-brand bg-brand-lighter",
          )}
        >
          <Text
            className={cn(
              "shrink text-sm font-semibold text-text-muted",
              values.length > 0 && "text-brand",
            )}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Icon
            as={ChevronsUpDown}
            className={cn("size-3.5 shrink-0 text-text-muted", values.length > 0 && "text-brand")}
          />
        </AnimatedPressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            closeOnPress={false}
            onCheckedChange={() => onToggle(option.value)}
          >
            <Text>{option.label}</Text>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
