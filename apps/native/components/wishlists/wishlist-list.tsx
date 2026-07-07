import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { InlineState } from "@/components/shared/inline-state";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { PinnedListHeader, usePinnedListHeaderPadding } from "@/components/ui/pinned-list-header";
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
import { chunkRows } from "@/lib/layout";
import { motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistAccentClass,
  getWishlistVisibilityLabels,
} from "@/lib/wishlists";
import {
  wishlistCardFadeIn,
  wishlistGridLinearTransition,
} from "@/components/wishlists/wishlist-grid-animations";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { Link } from "expo-router";
import {
  Gift,
  Link2,
  ListChecks,
  LockKeyhole,
  Package,
  Plus,
  ShoppingBag,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";

type SheetState =
  | { type: "edit"; wishlist: Wishlist }
  | { type: "addItem"; wishlist: Wishlist }
  | { type: "delete"; wishlist: Wishlist }
  | null;

type WishlistListRow = Wishlist[];

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
              onEdit={
                entry.is_owner || entry.can_edit
                  ? () => onOpenSheet({ type: "edit", wishlist: entry })
                  : undefined
              }
              onAddItem={
                entry.is_owner || entry.can_edit
                  ? () => onOpenSheet({ type: "addItem", wishlist: entry })
                  : undefined
              }
              onDelete={
                entry.is_owner ? () => onOpenSheet({ type: "delete", wishlist: entry }) : undefined
              }
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
        contentContainerClassName="pb-8"
        contentContainerStyle={{ paddingTop }}
        ItemSeparatorComponent={RowSeparator}
        onEndReached={onEndReached}
        isLoadingMore={query.isFetchingNextPage}
        onScroll={requestMeasure}
        scrollEventThrottle={1}
        ListHeaderComponent={
          <Animated.View
            layout={wishlistGridLinearTransition.duration(motionDuration.normal)}
            className="max-w-300 self-center pb-4"
            style={{ width: contentWidth }}
          >
            {ListHeaderComponent}
          </Animated.View>
        }
        ListFooterComponent={
          <View className="gap-5" style={{ alignSelf: "center", width: contentWidth }}>
            {query.isLoading ? (
              <WishlistGridSkeleton cardWidth={cardWidth} gridGap={gridGap} />
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

export function WishlistListStatsRow() {
  const { width } = useWindowDimensions();
  const { data, isError, isLoading } = useMyStatistics();
  const t = useGT();
  const [compact, setCompact] = React.useState(false);
  const contentWidth = Math.min(width - 32, 1200);
  const gap = compact ? 8 : 12;
  const cardWidth = compact ? (contentWidth - gap * 3) / 4 : (contentWidth - gap) / 2;
  const stats = [
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
  const statsLayoutTransition = wishlistGridLinearTransition.duration(motionDuration.normal);

  if (isLoading) {
    return (
      <View className="flex-row flex-wrap" style={{ gap }}>
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" style={{ width: cardWidth }} />
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
    <Animated.View layout={statsLayoutTransition} className="flex-row flex-wrap" style={{ gap }}>
      {stats.map((stat) => (
        <Animated.View key={stat.key} layout={statsLayoutTransition} style={{ width: cardWidth }}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("{label}: {value}", {
              label: stat.label,
              value: stat.value,
            })}
            accessibilityState={{ expanded: !compact }}
            onPress={() => setCompact((current) => !current)}
            className={cn(
              "w-full rounded-xl border border-border-subtle bg-card-bg shadow-sm",
              compact
                ? "h-14 flex-row items-center justify-center gap-1.5 p-0"
                : "flex-row items-center gap-3 p-4",
            )}
          >
            <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
              <Icon as={stat.icon} className="size-4 text-brand" />
            </View>
            {compact ? (
              <Text
                className="text-sm font-extrabold text-text"
                numberOfLines={1}
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {stat.value}
              </Text>
            ) : (
              <View className="min-w-0 flex-1">
                <Text
                  className="text-2xl font-extrabold text-text"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {stat.value}
                </Text>
                <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
                  {stat.label}
                </Text>
              </View>
            )}
          </AnimatedPressable>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

function WishlistGridSkeleton({ cardWidth, gridGap }: { cardWidth: number; gridGap: number }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: gridGap }}>
      {[0, 1, 2, 3].map((item) => (
        <View
          key={item}
          className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg"
          style={{ width: cardWidth }}
        >
          <Skeleton className="h-30 rounded-none" />
          <View className="gap-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

function RowSeparator() {
  return <View className="h-4" />;
}

function WishlistCard({
  wishlist,
  width,
  onEdit,
  onAddItem,
  onDelete,
  onOpen,
}: {
  wishlist: Wishlist;
  width: number;
  onEdit?: () => void;
  onAddItem?: () => void;
  onDelete?: () => void;
  onOpen?: () => void;
}) {
  const t = useGT();
  const visibilityLabels = React.useMemo(() => getWishlistVisibilityLabels(t), [t]);
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[visibility];
  const itemsCount = wishlist.items_count ?? 0;
  const showMenu = Boolean(onAddItem || onEdit || onDelete);
  const isShared = wishlist.is_owner === false;
  const ownerNickname = wishlist.owner_nickname?.trim();
  const sharedLabel = ownerNickname
    ? t("Shared by @{nickname}", { nickname: ownerNickname })
    : t("Shared wishlist");
  const menuTriggerRef = React.useRef<TriggerRef>(null);
  return (
    <Animated.View entering={wishlistCardFadeIn} style={{ width }}>
      <DropdownMenu className="relative">
        <Link href={{ pathname: "/wishlists/[id]", params: { id: wishlist.id } }} asChild>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t('Open "{title}"', {
              title: wishlist.title,
            })}
            onLongPress={showMenu ? () => menuTriggerRef.current?.open() : undefined}
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
                  className="absolute left-3 top-3 flex-row border-white/30 bg-white/80"
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

                {onAddItem ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Add item")}
                    onPress={onAddItem}
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
        {showMenu ? (
          <DropdownMenuTrigger asChild>
            <AnimatedPressable
              ref={menuTriggerRef}
              pointerEvents="none"
              className="absolute right-4 top-33 size-10 opacity-0"
            />
          </DropdownMenuTrigger>
        ) : null}
        <DropdownMenuContent className="min-w-36">
          {onEdit ? (
            <DropdownMenuItem onPress={onEdit}>
              <Text>{t("Edit")}</Text>
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <DropdownMenuItem variant="destructive" onPress={onDelete}>
              <Text>{t("Delete")}</Text>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </Animated.View>
  );
}
