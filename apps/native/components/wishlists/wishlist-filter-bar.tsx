import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { AnimatedGradientBackgroundButton } from "@/components/ui/buttons/AnimatedGradientBackgroundButton";
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
  DEFAULT_WISHLIST_SORT,
  getWishlistSortOptions,
  getWishlistVisibilityOptions,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Plus, Search, SlidersHorizontal, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

export function WishlistFilterBar({
  search,
  visibility,
  sort,
  onSearchChange,
  onVisibilityChange,
  onSortChange,
  onResetFilters,
  onCreateWishlist,
  filtersOpen,
  onFiltersOpenChange,
}: {
  search: string;
  visibility: string[];
  sort: string;
  onSearchChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onResetFilters: () => void;
  onCreateWishlist: () => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const sortOptions = React.useMemo(() => getWishlistSortOptions(t), [t]);
  const visibilityOptions = React.useMemo(() => getWishlistVisibilityOptions(t), [t]);

  const selectedSortLabel =
    sortOptions.find((option) => option.value === sort)?.label ?? t("Newest first");
  const selectedVisibilityLabel =
    visibility.length === 0
      ? t("Visibility")
      : visibility.length === 1
        ? (visibilityOptions.find((option) => option.value === visibility[0])?.label ??
          t("Visibility"))
        : t("{count} selected", { count: visibility.length });
  const canResetFilters =
    search.trim() !== "" || visibility.length > 0 || sort !== DEFAULT_WISHLIST_SORT;

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="text-xl font-extrabold tracking-tight text-text">{t("Wishlists")}</Text>
          <Button
            variant="outline"
            size="lg"
            accessibilityLabel={t("Show filters")}
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => onFiltersOpenChange(!filtersOpen)}
            className={cn(
              "h-11 w-11 min-w-11 shrink-0 rounded-full border-border-subtle bg-card-bg p-0 sm:h-11 sm:w-11 sm:min-w-11",
              filtersOpen && "border-brand bg-brand-lighter",
            )}
          >
            <Icon
              as={SlidersHorizontal}
              className={cn("size-4 text-text", filtersOpen && "text-brand")}
            />
          </Button>
          {canResetFilters ? (
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
        </View>
        <AnimatedGradientBackgroundButton
          accessibilityLabel={t("Add wishlist")}
          Icon={<Icon as={Plus} className="size-4 text-primary-foreground" />}
          onPress={onCreateWishlist}
          title={t("Add Wishlist")}
        />
      </View>

      {filtersOpen ? (
        <View className="gap-3">
          <View className="w-full flex-row items-center gap-1 rounded-full border border-border-subtle bg-card-bg px-2 pl-3 shadow-sm">
            <Icon as={Search} className="size-4 text-text-muted" />
            <Input
              value={search}
              onChangeText={onSearchChange}
              placeholder={t("Search wishlists...")}
              className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none"
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
                    accessibilityRole="button"
                    accessibilityLabel={t("Filter by visibility")}
                    className={cn(
                      "h-10 w-full flex-row items-center justify-between gap-2 rounded-full border border-border-subtle bg-card-bg px-3",
                      visibility.length > 0 && "border-brand bg-brand-lighter",
                    )}
                  >
                    <Text
                      className={cn(
                        "shrink text-sm font-semibold text-text-muted",
                        visibility.length > 0 && "text-brand",
                      )}
                      numberOfLines={1}
                    >
                      {selectedVisibilityLabel}
                    </Text>
                    <Icon
                      as={ChevronsUpDown}
                      className={cn(
                        "size-3.5 shrink-0 text-text-muted",
                        visibility.length > 0 && "text-brand",
                      )}
                    />
                  </AnimatedPressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-52">
                  {visibilityOptions.map((option) => {
                    const VisibilityIcon = option.icon;
                    return (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        className={cn(option.surfaceClassName, option.itemClassName)}
                        checked={visibility.includes(option.value)}
                        closeOnPress={false}
                        onCheckedChange={() => onVisibilityChange(option.value)}
                      >
                        <Icon as={VisibilityIcon} className="size-3.5 text-popover-foreground" />
                        <Text>{option.label}</Text>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </View>
            <View className="min-w-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AnimatedPressable className="h-10 w-full flex-row items-center justify-between gap-2 rounded-full border border-border-subtle bg-card-bg px-3">
                    <Text className="shrink text-sm font-semibold text-text" numberOfLines={1}>
                      {selectedSortLabel}
                    </Text>
                    <Icon as={ChevronsUpDown} className="size-3.5 shrink-0 text-text-muted" />
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
        </View>
      ) : null}
    </View>
  );
}
