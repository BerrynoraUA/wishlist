import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { InlineState } from "@/components/shared/inline-state";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useDropdownMenuPreview,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { PinnedListHeader, usePinnedListHeaderPadding } from "@/components/ui/pinned-list-header";
import { CardGridSkeleton } from "@/components/ui/list-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { GuideTarget } from "@/components/user-guide/guide-target";
import {
  useUserGuideStepCompletion,
  useUserGuideTargetRegistration,
} from "@/components/user-guide/user-guide-provider";
import { USER_GUIDE_STEP_IDS } from "@/components/user-guide/user-guide-config";
import { useMyStatistics } from "@/hooks/use-wishlists";
import { chunkRows, useTabBarContentPadding } from "@/lib/layout";
import { motionDuration, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistAccentClass,
  getWishlistVisibilityLabels,
} from "@/lib/wishlists";
import { wishlistCardFadeIn } from "@/components/wishlists/wishlist-grid-animations";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { Link } from "expo-router";
import {
  Gift,
  Link2,
  ListChecks,
  LockKeyhole,
  type LucideIcon,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import {
  I18nManager,
  type LayoutChangeEvent,
  Pressable,
  type TextStyle,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type SheetState =
  | { type: "edit"; wishlist: Wishlist }
  | { type: "addItem"; wishlist: Wishlist }
  | { type: "delete"; wishlist: Wishlist }
  | null;

type WishlistListRow = Wishlist[];
const AnimatedPressableContainer = Animated.createAnimatedComponent(Pressable);

export function WishlistList({
  query,
  wishlists,
  filtersActive,
  cardWidth,
  contentWidth,
  columns,
  gridGap,
  FilterHeaderComponent,
  ListHeaderComponent,
  onEndReached,
  onOpenSheet,
}: {
  query: {
    isLoading: boolean;
    isFetchingNextPage?: boolean;
    isError: boolean;
  };
  wishlists: Wishlist[];
  filtersActive: boolean;
  cardWidth: number;
  contentWidth: number;
  columns: number;
  gridGap: number;
  FilterHeaderComponent: React.ReactElement;
  ListHeaderComponent: React.ReactElement;
  onEndReached: () => void;
  onOpenSheet: (sheet: Exclude<SheetState, null>) => void;
}) {
  const t = useGT();
  const completeOpenDetailStep = useUserGuideStepCompletion(
    USER_GUIDE_STEP_IDS.openWishlistDetails,
  );
  const { requestMeasure } = useUserGuideTargetRegistration();
  const { paddingTop, onHeaderLayout } = usePinnedListHeaderPadding();
  const paddingBottom = useTabBarContentPadding();
  const rows = React.useMemo(() => chunkRows(wishlists, columns), [columns, wishlists]);
  const data = React.useMemo<WishlistListRow[]>(
    () => (query.isLoading ? [] : rows),
    [query.isLoading, rows],
  );
  const renderRow = React.useCallback(
    ({ item, index }: { item: WishlistListRow; index: number }) => (
      <View
        className="flex-row"
        style={{
          alignSelf: "center",
          gap: gridGap,
          width: contentWidth,
        }}
      >
        {item.map((entry, entryIndex) => {
          const isFirstWishlistCard = index === 0 && entryIndex === 0;
          const card = (
            <WishlistCard
              key={entry.id}
              wishlist={entry}
              width={cardWidth}
              onOpen={isFirstWishlistCard ? completeOpenDetailStep : undefined}
              onOpenSheet={onOpenSheet}
            />
          );

          return isFirstWishlistCard ? (
            <GuideTarget
              attachedTooltip={false}
              key={entry.id}
              id="home-wishlist-card"
              style={{ width: cardWidth }}
              tooltipHorizontalOffset={-24}
              tooltipPlacementOverride="top"
            >
              {card}
            </GuideTarget>
          ) : (
            card
          );
        })}
      </View>
    ),
    [cardWidth, contentWidth, gridGap, onOpenSheet, completeOpenDetailStep],
  );

  return (
    <View className="flex-1">
      <PinnedListHeader onLayout={onHeaderLayout}>
        <View className="max-w-300 self-center" style={{ width: contentWidth }}>
          {FilterHeaderComponent}
        </View>
      </PinnedListHeader>
      <StyledFlashList
        data={data}
        renderItem={renderRow}
        keyExtractor={(row) => row.map((entry) => entry.id).join(":")}
        className="flex-1"
        contentContainerStyle={{ paddingTop, paddingBottom }}
        ItemSeparatorComponent={RowSeparator}
        onEndReached={onEndReached}
        isLoadingMore={query.isFetchingNextPage}
        onScroll={requestMeasure}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View className="max-w-300 self-center pb-4" style={{ width: contentWidth }}>
            {ListHeaderComponent}
          </View>
        }
        ListFooterComponent={
          <View className="gap-5" style={{ alignSelf: "center", width: contentWidth }}>
            {query.isLoading ? (
              <CardGridSkeleton cardWidth={cardWidth} gridGap={gridGap} />
            ) : null}
            {query.isError ? (
              <InlineState width={contentWidth} message={t("Failed to load wishlists.")} />
            ) : null}
            {!query.isLoading && !query.isError && wishlists.length === 0 && filtersActive ? (
              <InlineState
                width={contentWidth}
                mascot="magnifying-glass"
                message={t("No wishlists match your filters.")}
              />
            ) : null}
            {!query.isLoading && !query.isError && wishlists.length === 0 && !filtersActive ? (
              <InlineState
                width={contentWidth}
                mascot="sad-alone"
                message={t("No wishlists yet.")}
                pointToCreateButton
              />
            ) : null}
          </View>
        }
        extraData={{
          cardWidth,
          contentWidth,
          gridGap,
          paddingTop,
        }}
      />
    </View>
  );
}

const STATS_EXPANDED_GAP = 12;
const STATS_COMPACT_GAP = 8;
const STATS_COMPACT_HEIGHT = 56;
const STATS_EXPANDED_HEIGHT_FALLBACK = 84;
/**
 * Slot each card lands in once the 2x2 grid folds into a single row. The fold
 * is mirror-symmetric: the top row spreads out to the edges while the bottom
 * row rises diagonally into the middle, so no two cards cross paths.
 */
const STATS_COMPACT_SLOTS = [0, 3, 1, 2];
const STATS_FOLD_EASING = Easing.bezier(0.25, 1, 0.5, 1);
const TABULAR_NUMS: TextStyle = { fontVariant: ["tabular-nums"] };

type StatEntry = {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
};

export function WishlistListStatsRow() {
  const { width } = useWindowDimensions();
  const { data, isError, isLoading } = useMyStatistics();
  const t = useGT();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [compact, setCompact] = React.useState(false);
  const [expandedHeight, setExpandedHeight] = React.useState(STATS_EXPANDED_HEIGHT_FALLBACK);
  const contentWidth = Math.min(width - 32, 1200);
  const expandedWidth = (contentWidth - STATS_EXPANDED_GAP) / 2;
  const compactWidth = (contentWidth - STATS_COMPACT_GAP * 3) / 4;
  const expandedGridHeight = expandedHeight * 2 + STATS_EXPANDED_GAP;
  const stats: StatEntry[] = [
    {
      key: "wishlists",
      label: t("Wishlists"),
      value: data?.wishlists_count ?? 0,
      icon: ListChecks,
    },
    {
      key: "total-items",
      label: t("Total Items"),
      value: data?.total_items_count ?? 0,
      icon: Package,
    },
    {
      key: "reserved",
      label: t("Reserved"),
      value: data?.reserved_items_count ?? 0,
      icon: LockKeyhole,
    },
    {
      key: "purchased",
      label: t("Purchased"),
      value: data?.purchased_items_count ?? 0,
      icon: ShoppingBag,
    },
  ];

  // The grid is exactly as tall as the cards it holds at every point of the
  // fold, so shrinking it pulls the list content below up in the same frame.
  const gridStyle = useAnimatedStyle(
    () => ({
      height: expandedGridHeight + (STATS_COMPACT_HEIGHT - expandedGridHeight) * progress.value,
    }),
    [expandedGridHeight],
  );

  const handleExpandedHeight = React.useCallback((height: number) => {
    setExpandedHeight((current) => (Math.abs(current - height) > 0.5 ? height : current));
  }, []);

  const toggle = React.useCallback(() => {
    const next = !compact;
    setCompact(next);
    progress.value = withTiming(next ? 1 : 0, {
      duration: reducedMotion ? 0 : motionDuration.normal,
      easing: STATS_FOLD_EASING,
    });
  }, [compact, progress, reducedMotion]);

  if (isLoading) {
    return (
      <View className="flex-row flex-wrap" style={{ gap: STATS_EXPANDED_GAP }}>
        {[0, 1, 2, 3].map((item) => (
          <Skeleton
            key={item}
            className="rounded-xl"
            style={{ width: expandedWidth, height: expandedHeight }}
          />
        ))}
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="rounded-xl border border-border-subtle bg-card-bg p-4">
        <Text className="text-sm text-destructive">{t("Failed to load stats.")}</Text>
      </View>
    );
  }

  return (
    <AnimatedPressableContainer
      accessibilityRole="button"
      accessibilityLabel={t("Toggle wishlist stats view")}
      accessibilityState={{ expanded: !compact }}
      onPress={toggle}
      style={gridStyle}
    >
      {stats.map((stat, index) => (
        <StatCard
          key={stat.key}
          stat={stat}
          index={index}
          compact={compact}
          progress={progress}
          expandedWidth={expandedWidth}
          expandedHeight={expandedHeight}
          compactWidth={compactWidth}
          onExpandedHeight={index === 0 ? handleExpandedHeight : undefined}
        />
      ))}
    </AnimatedPressableContainer>
  );
}

/**
 * Cards are absolutely positioned at their expanded slot and driven entirely by
 * one shared value: the box interpolates its own size, and the two content
 * layouts are pre-laid out at fixed sizes and cross-faded, so a fold never
 * re-measures text.
 */
function StatCard({
  stat,
  index,
  compact,
  progress,
  expandedWidth,
  expandedHeight,
  compactWidth,
  onExpandedHeight,
}: {
  stat: StatEntry;
  index: number;
  compact: boolean;
  progress: SharedValue<number>;
  expandedWidth: number;
  expandedHeight: number;
  compactWidth: number;
  onExpandedHeight?: (height: number) => void;
}) {
  const expandedX = index % 2 === 0 ? 0 : expandedWidth + STATS_EXPANDED_GAP;
  const expandedY = index < 2 ? 0 : expandedHeight + STATS_EXPANDED_GAP;
  const compactX = STATS_COMPACT_SLOTS[index] * (compactWidth + STATS_COMPACT_GAP);
  const travelX = (compactX - expandedX) * (I18nManager.isRTL ? -1 : 1);

  const boxStyle = useAnimatedStyle(() => {
    const value = progress.value;
    return {
      width: expandedWidth + (compactWidth - expandedWidth) * value,
      height: expandedHeight + (STATS_COMPACT_HEIGHT - expandedHeight) * value,
      transform: [{ translateX: travelX * value }, { translateY: -expandedY * value }],
    };
  }, [compactWidth, expandedHeight, expandedWidth, expandedY, travelX]);

  const expandedContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
  }));

  const compactContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => onExpandedHeight?.(event.nativeEvent.layout.height),
    [onExpandedHeight],
  );

  return (
    <Animated.View
      className="absolute overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
      style={[{ top: expandedY, insetInlineStart: expandedX }, boxStyle]}
    >
      <Animated.View
        accessibilityElementsHidden={compact}
        importantForAccessibility={compact ? "no-hide-descendants" : "yes"}
        className="absolute start-0 top-0 flex-row items-center gap-3 p-4"
        onLayout={onExpandedHeight ? handleLayout : undefined}
        style={[{ width: expandedWidth }, expandedContentStyle]}
      >
        <StatIcon icon={stat.icon} />
        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-extrabold text-text" style={TABULAR_NUMS}>
            {stat.value}
          </Text>
          <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
            {stat.label}
          </Text>
        </View>
      </Animated.View>
      <Animated.View
        accessibilityElementsHidden={!compact}
        importantForAccessibility={compact ? "yes" : "no-hide-descendants"}
        className="absolute start-0 top-0 flex-row items-center justify-center gap-1.5"
        style={[{ width: compactWidth, height: STATS_COMPACT_HEIGHT }, compactContentStyle]}
      >
        <StatIcon icon={stat.icon} />
        <Text className="text-sm font-extrabold text-text" numberOfLines={1} style={TABULAR_NUMS}>
          {stat.value}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function StatIcon({ icon }: { icon: LucideIcon }) {
  return (
    <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
      <Icon as={icon} className="size-4 text-brand" />
    </View>
  );
}

function RowSeparator() {
  return <View className="h-4" />;
}

function WishlistCard({
  wishlist,
  width,
  onOpen,
  onOpenSheet,
}: {
  wishlist: Wishlist;
  width: number;
  onOpen?: () => void;
  onOpenSheet: (sheet: Exclude<SheetState, null>) => void;
}) {
  const t = useGT();
  const visibilityLabels = React.useMemo(() => getWishlistVisibilityLabels(t), [t]);
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[visibility];
  const itemsCount = wishlist.items_count ?? 0;
  const canEdit = wishlist.is_owner || wishlist.can_edit;
  const showMenu = canEdit;
  const isShared = wishlist.is_owner === false;
  const ownerNickname = wishlist.owner_nickname?.trim();
  const sharedLabel = ownerNickname
    ? t("Shared by @{nickname}", { nickname: ownerNickname })
    : t("Shared wishlist");
  const menuPreview = useDropdownMenuPreview();
  return (
    <Animated.View entering={wishlistCardFadeIn} style={{ width }}>
      <DropdownMenu className="relative" onOpenChange={menuPreview.onOpenChange}>
        <View ref={menuPreview.cardRef} collapsable={false}>
          <Link href={{ pathname: "/wishlists/[id]", params: { id: wishlist.id } }} asChild>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={t('Open "{title}"', {
                title: wishlist.title,
              })}
              onLongPress={showMenu ? menuPreview.openMenu : undefined}
              onPress={onOpen}
              className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
              pressedScale={0.98}
            >
              <View className="h-30 items-center justify-center overflow-hidden">
                <View
                  className={cn("absolute inset-0", getWishlistAccentClass(wishlist.accent_type))}
                />
                {wishlist.image_url ? (
                  <StyledImage
                    source={{ uri: wishlist.image_url }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={wishlist.id}
                    className="absolute inset-0 size-full"
                  />
                ) : (
                  <Icon as={Gift} className="size-10 text-white/85" />
                )}
                <View className="absolute inset-0 bg-black/10" />
                {isShared ? (
                  <Badge
                    variant="secondary"
                    className="absolute start-3 top-3 flex-row border-white/30 bg-white/80"
                    accessibilityLabel={sharedLabel}
                  >
                    <Icon as={Link2} className="size-3 text-text" />
                    <Text className="text-xs font-bold text-text">{t("Shared")}</Text>
                  </Badge>
                ) : null}
              </View>

              <View className="gap-3 px-4 pb-4 pt-3">
                <View className="min-h-11 flex-row items-start justify-between gap-3">
                  <Text
                    className="flex-1 text-[15px] font-bold leading-5 text-text"
                    numberOfLines={2}
                  >
                    {wishlist.title}
                  </Text>

                  {canEdit ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={t("Add item")}
                      onPress={() => onOpenSheet({ type: "addItem", wishlist })}
                      className="size-10 items-center justify-center rounded-full bg-brand-lighter active:bg-brand-alpha-12"
                    >
                      <Icon as={Plus} className="size-4 text-brand" />
                    </AnimatedPressable>
                  ) : null}
                </View>

                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-semibold text-text-muted">
                    {itemsCount === 1 ? t("1 item") : t("{count} items", { count: itemsCount })}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Icon as={VisibilityIcon} className="size-3.5 text-text-muted" />
                    <Text className="text-sm font-semibold text-text-muted">
                      {visibilityLabels[visibility]}
                    </Text>
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          </Link>
        </View>
        {showMenu ? (
          <DropdownMenuTrigger asChild>
            <AnimatedPressable
              ref={menuPreview.triggerRef}
              pointerEvents="none"
              className="absolute inset-0 opacity-0"
            />
          </DropdownMenuTrigger>
        ) : null}
        <DropdownMenuContent backdrop="blur" preview={menuPreview.preview} sideOffset={10}>
          {canEdit ? (
            <DropdownMenuItem
              layout="action"
              onPress={() => onOpenSheet({ type: "edit", wishlist })}
            >
              <Text className="flex-1">{t("Edit")}</Text>
              <Icon as={Pencil} className="ms-auto size-4 text-text-muted" />
            </DropdownMenuItem>
          ) : null}
          {wishlist.is_owner ? (
            <DropdownMenuItem
              layout="action"
              variant="destructive"
              onPress={() => onOpenSheet({ type: "delete", wishlist })}
            >
              <Text className="flex-1">{t("Delete")}</Text>
              <Icon as={Trash2} className="ms-auto size-4 text-destructive" />
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </Animated.View>
  );
}
