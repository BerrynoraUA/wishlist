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
import { GuideTarget } from "@/components/user-guide/guide-target";
import {
  DEFAULT_WISHLIST_SORT,
  getWishlistSortOptions,
  getWishlistVisibilityOptions,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { ChevronsUpDown, Search, SlidersHorizontal, Sparkles, X } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { StyleSheet, View } from "react-native";

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();
const PILL_GLASS_STYLE = [StyleSheet.absoluteFill, { borderRadius: 9999 }];

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
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="text-xl font-extrabold tracking-tight text-text">{t("Wishlists")}</Text>
          <Button
            variant="outline"
            size="icon-lg"
            accessibilityLabel={t("Show filters")}
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => onFiltersOpenChange(!filtersOpen)}
            className={cn(
              "shrink-0 rounded-full",
              filtersOpen
                ? "border-brand bg-brand-lighter dark:bg-brand-lighter"
                : HAS_LIQUID_GLASS
                  ? "border-transparent bg-transparent dark:bg-transparent"
                  : "border-border-subtle bg-card-bg dark:bg-card-bg",
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
          {canResetFilters ? (
            <Button
              variant="destructive"
              size="icon-lg"
              accessibilityLabel={t("Clear filters")}
              onPress={onResetFilters}
              className="shrink-0 rounded-full"
            >
              <Icon as={X} className="size-4 text-white" />
            </Button>
          ) : null}
        </View>
        <GuideTarget id="wishlists-discover">
          <AnimatedGradientBackgroundButton
            accessibilityLabel={t("Discover")}
            Icon={<Icon as={Sparkles} className="size-4 text-primary-foreground" />}
            onPress={onOpenDiscover}
            title={t("Discover")}
          />
        </GuideTarget>
      </View>

      {filtersOpen ? (
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
                        : HAS_LIQUID_GLASS
                          ? "border-transparent bg-transparent dark:bg-transparent"
                          : "border-border-subtle bg-card-bg dark:bg-card-bg",
                    )}
                  >
                    {visibility.length === 0 && HAS_LIQUID_GLASS ? (
                      <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
                    ) : null}
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
                    className={cn(
                      "w-full justify-between shadow-none",
                      HAS_LIQUID_GLASS
                        ? "border-transparent bg-transparent dark:bg-transparent"
                        : "border-border-subtle bg-card-bg dark:bg-card-bg",
                    )}
                  >
                    {HAS_LIQUID_GLASS ? (
                      <GlassView pointerEvents="none" style={PILL_GLASS_STYLE} />
                    ) : null}
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
        </View>
      ) : null}
    </View>
  );
}
