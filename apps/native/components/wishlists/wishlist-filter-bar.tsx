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
import { SearchClearButton } from "@/components/ui/search-clear-button";
import { FilterActions } from "@/components/ui/filter-actions";
import {
  GLASS_CAPSULE_STYLE,
  GLASS_MERGE_SPACING,
  GLASS_PILL_CLASS,
  GlassCapsuleSlot,
  HAS_LIQUID_GLASS,
  MorphingGlassButton,
  PanelPillGlass,
} from "@/components/ui/liquid-glass";
import { SlideOutFilterPanel } from "@/components/ui/slide-out-filter-panel";
import { Text } from "@/components/ui/text";
import { ZoomLink } from "@/components/ui/zoom-link";
import { GuideTarget } from "@/components/user-guide/guide-target";
import {
  DEFAULT_WISHLIST_SORT,
  getWishlistSortOptions,
  getWishlistVisibilityOptions,
} from "@/lib/wishlists";
import { cn } from "@/lib/utils";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { ChevronsUpDown, Search, Sparkles } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Pressable, StyleSheet, type TextInput, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

const styles = StyleSheet.create({
  glassGroup: { flexDirection: "row", alignItems: "center" },
});

/**
 * The row above the wishlists: Discover, filter toggle, notifications. The panel it opens
 * is `WishlistFilterPanel`, rendered by the pinned header below this row.
 */
export function WishlistFilterBar({
  search,
  visibility,
  sort,
  onResetFilters,
  onOpenDiscover,
  filtersOpen,
  onFiltersOpenChange,
}: {
  search: string;
  visibility: string[];
  sort: string;
  onResetFilters: () => void;
  /** Runs as Discover opens; the bar does the navigating. */
  onOpenDiscover: () => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const router = useRouter();
  const canResetFilters =
    search.trim() !== "" || visibility.length > 0 || sort !== DEFAULT_WISHLIST_SORT;

  // iOS 26: the controls behave like system bar buttons. Each sits on interactive liquid
  // glass (it flexes and glows under the finger) and Discover zooms open out of its own
  // button. The right capsule groups whatever belongs together: filter + notifications at
  // rest; once filters are active, clear + filter, with notifications splitting off into
  // their own button (and melting back in when the filters are cleared).
  if (HAS_LIQUID_GLASS) {
    return (
      <View className="flex-row items-center justify-between gap-3">
        <GuideTarget id="wishlists-discover" borderRadius={999}>
          <GlassView isInteractive style={GLASS_CAPSULE_STYLE}>
            <ZoomLink href="/wishlists/discover">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Discover")}
                onPress={onOpenDiscover}
                className="h-11 flex-row items-center gap-1.5 px-4"
              >
                <Icon as={Sparkles} className="size-[18px] text-brand" />
                <Text className="text-[17px] font-semibold text-brand">{t("Discover")}</Text>
              </Pressable>
            </ZoomLink>
          </GlassView>
        </GuideTarget>
        <NotificationsMenu
          trigger={({ onOpen: onOpenNotifications, open: notificationsOpen, renderBell }) => (
            <GlassContainer spacing={GLASS_MERGE_SPACING} style={styles.glassGroup}>
              <FilterActions
                active={canResetFilters}
                open={filtersOpen}
                filterAccessibilityLabel={t("Show filters")}
                clearAccessibilityLabel={t("Clear filters")}
                onOpenChange={onFiltersOpenChange}
                onReset={onResetFilters}
              >
                <GlassCapsuleSlot
                  visible={!canResetFilters}
                  accessibilityLabel={t("Notifications")}
                  accessibilityState={{ expanded: notificationsOpen }}
                  onPress={onOpenNotifications}
                >
                  {renderBell()}
                </GlassCapsuleSlot>
              </FilterActions>
              <MorphingGlassButton
                visible={canResetFilters}
                placement="after"
                accessibilityLabel={t("Notifications")}
                accessibilityState={{ expanded: notificationsOpen }}
                onPress={onOpenNotifications}
              >
                {renderBell()}
              </MorphingGlassButton>
            </GlassContainer>
          )}
        />
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between gap-3">
      <GuideTarget id="wishlists-discover" borderRadius={999}>
        {process.env.EXPO_OS === "android" ? (
          <Button
            variant="secondary"
            size="pill"
            accessibilityLabel={t("Discover")}
            className="gap-2 overflow-hidden rounded-full bg-brand-lighter px-4"
            onPress={() => {
              onOpenDiscover();
              router.push("/wishlists/discover");
            }}
          >
            <Icon as={Sparkles} className="size-5 text-brand" />
            <Text className="text-base font-semibold text-brand">{t("Discover")}</Text>
          </Button>
        ) : (
          <AnimatedGradientBackgroundButton
            accessibilityLabel={t("Discover")}
            Icon={<Icon as={Sparkles} className="size-4 text-brand" />}
            onPress={() => {
              onOpenDiscover();
              router.push("/wishlists/discover");
            }}
            title={t("Discover")}
            variant="brand"
          />
        )}
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
  );
}

export function WishlistFilterPanel({
  searchInputRef,
  search,
  visibility,
  sort,
  onSearchChange,
  onVisibilityChange,
  onSortChange,
  open,
  progress,
  height,
}: {
  searchInputRef: React.RefObject<TextInput | null>;
  search: string;
  visibility: string[];
  sort: string;
  onSearchChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onSortChange: (value: string) => void;
  open: boolean;
  progress: SharedValue<number>;
  height: SharedValue<number>;
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

  return (
    <SlideOutFilterPanel open={open} progress={progress} height={height}>
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
          placeholder={t("Search wishlists...")}
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
              <Button
                variant="outline"
                size="pill"
                accessibilityLabel={t("Filter by visibility")}
                className={cn(
                  "w-full justify-between shadow-none android:overflow-hidden",
                  HAS_LIQUID_GLASS
                    ? GLASS_PILL_CLASS
                    : visibility.length > 0
                      ? "border-brand bg-brand-lighter dark:bg-brand-lighter"
                      : "border-border-subtle bg-card-bg dark:bg-card-bg",
                )}
              >
                {HAS_LIQUID_GLASS ? <PanelPillGlass open={open} /> : null}
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
                  "w-full justify-between shadow-none android:overflow-hidden",
                  HAS_LIQUID_GLASS
                    ? GLASS_PILL_CLASS
                    : "border-border-subtle bg-card-bg dark:bg-card-bg",
                )}
              >
                {HAS_LIQUID_GLASS ? <PanelPillGlass open={open} /> : null}
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
  );
}
