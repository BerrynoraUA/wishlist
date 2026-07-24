import { AnimatedGradientBackgroundButton } from "@/components/ui/buttons/AnimatedGradientBackgroundButton";
import { NotificationsMenu } from "@/components/notifications/notifications-menu";
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
import { FilterActions } from "@/components/ui/filter-actions";
import {
  SlideOutFilterPanel,
  WISHLIST_FILTER_PANEL_HEIGHT,
} from "@/components/ui/slide-out-filter-panel";
import { Text } from "@/components/ui/text";
import { GuideTarget } from "@/components/user-guide/guide-target";
import {
  DEFAULT_WISHLIST_SORT,
  getWishlistSortOptions,
  getWishlistVisibilityOptions,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Search, Sparkles, X } from "lucide-react-native";
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
  onOpenDiscover,
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
  onOpenDiscover: () => void;
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
    <View>
      <View className="flex-row items-center justify-between gap-3">
        <GuideTarget id="wishlists-discover">
          <AnimatedGradientBackgroundButton
            accessibilityLabel={t("Discover")}
            Icon={<Icon as={Sparkles} className="size-4 text-brand" />}
            onPress={onOpenDiscover}
            title={t("Discover")}
            variant="brand"
          />
        </GuideTarget>
        <View className="flex-row items-center justify-end gap-2">
          <FilterActions
            active={canResetFilters}
            open={filtersOpen}
            filterAccessibilityLabel={t("Show filters")}
            clearAccessibilityLabel={t("Clear filters")}
            onOpenChange={onFiltersOpenChange}
            onReset={onResetFilters}
          />
          <NotificationsMenu />
        </View>
      </View>

      <SlideOutFilterPanel
        open={filtersOpen}
        className="pb-1 pt-4"
        maxHeight={WISHLIST_FILTER_PANEL_HEIGHT}
      >
        <View className="w-full flex-row items-center gap-1 rounded-full border border-border-subtle bg-card-bg px-2 ps-3 shadow-sm">
          <Icon as={Search} className="size-4 text-muted-foreground/50" />
          <Input
            value={search}
            onChangeText={onSearchChange}
            placeholder={t("Search wishlists...")}
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
                <Button
                  variant="outline"
                  size="pill"
                  accessibilityLabel={t("Filter by visibility")}
                  className={cn(
                    "w-full justify-between shadow-none",
                    visibility.length > 0
                      ? "border-brand bg-brand-lighter dark:bg-brand-lighter"
                      : "border-border-subtle bg-card-bg dark:bg-card-bg",
                  )}
                >
                  <Text
                    className={cn(
                      "shrink text-sm font-semibold text-text",
                      visibility.length > 0 && "text-brand",
                    )}
                    numberOfLines={1}
                  >
                    {selectedVisibilityLabel}
                  </Text>
                  <Icon
                    as={ChevronsUpDown}
                    className={cn(
                      "size-3.5 shrink-0 text-text",
                      visibility.length > 0 && "text-brand",
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-52">
                {visibilityOptions.map((option) => {
                  const VisibilityIcon = option.icon;
                  return (
                    <DropdownMenuCheckboxItem
                      key={option.value}
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
                <Button
                  variant="outline"
                  size="pill"
                  accessibilityLabel={t("Sort wishlists")}
                  className="w-full justify-between border-border-subtle bg-card-bg shadow-none dark:bg-card-bg"
                >
                  <Text className="shrink text-sm font-semibold text-text" numberOfLines={1}>
                    {selectedSortLabel}
                  </Text>
                  <Icon as={ChevronsUpDown} className="size-3.5 shrink-0 text-text" />
                </Button>
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
      </SlideOutFilterPanel>
    </View>
  );
}
