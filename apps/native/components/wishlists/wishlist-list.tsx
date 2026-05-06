import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { InlineState } from "@/components/shared/inline-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "@/components/ui/linear-gradient";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { StyledImage } from "@/components/ui/styled-image";
import { Text } from "@/components/ui/text";
import { useMyStatistics } from "@/hooks/use-wishlists";
import { chunkRows } from "@/lib/layout";
import { getThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistAccentGradientColors,
  getWishlistVisibilityLabels,
} from "@/lib/wishlists";
import { AddCard } from "@/components/wishlists/add-card";
import { wishlistCardFadeIn } from "@/components/wishlists/wishlist-grid-animations";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { Link } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";

type SheetState =
  | { type: "create" }
  | { type: "edit"; wishlist: Wishlist }
  | { type: "addItem"; wishlist: Wishlist }
  | { type: "delete"; wishlist: Wishlist }
  | null;

type WishlistListEntry = Wishlist | { id: "create"; type: "create" };
type WishlistListRow = WishlistListEntry[] | { id: "filters"; type: "filters" };

export function WishlistList({
  query,
  wishlists,
  filtersActive,
  cardWidth,
  contentWidth,
  columns,
  gridGap,
  pagination,
  page,
  ListHeaderComponent,
  StickyHeaderComponent,
  onPageChange,
  onCreateWishlist,
  onOpenSheet,
}: {
  query: {
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
  };
  wishlists: Wishlist[];
  filtersActive: boolean;
  cardWidth: number;
  contentWidth: number;
  columns: number;
  gridGap: number;
  pagination: {
    hasNextPage: boolean;
    hasPrevPage: boolean;
    showPagination: boolean;
    totalForPagination: number;
  };
  page: number;
  ListHeaderComponent: React.ReactElement;
  StickyHeaderComponent: React.ReactElement;
  onPageChange: (page: number) => void;
  onCreateWishlist: () => void;
  onOpenSheet: (sheet: Exclude<SheetState, null>) => void;
}) {
  const t = useGT();
  const insets = useSafeAreaInsets();
  const entries = React.useMemo<WishlistListEntry[]>(
    () =>
      !query.isError && wishlists.length > 0
        ? [...wishlists, { id: "create", type: "create" }]
        : wishlists,
    [query.isError, wishlists],
  );
  const rows = React.useMemo(() => chunkRows(entries, columns), [columns, entries]);
  const data = React.useMemo<WishlistListRow[]>(
    () => [{ id: "filters", type: "filters" }, ...(query.isLoading ? [] : rows)],
    [query.isLoading, rows],
  );
  const renderRow = React.useCallback(
    ({ item, target }: { item: WishlistListRow; target: string }) =>
      "type" in item ? (
        <View
          className={cn("z-[2] pb-4", target === "StickyHeader" ? "bg-bg" : "bg-transparent")}
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="max-w-[1200px] self-center" style={{ width: contentWidth }}>
            {StickyHeaderComponent}
          </View>
        </View>
      ) : (
        <View
          className="flex-row"
          style={{
            alignSelf: "center",
            gap: gridGap,
            opacity: query.isFetching ? 0.6 : 1,
            width: contentWidth,
          }}
        >
          {item.map((entry) =>
            "type" in entry ? (
              <AddCard
                key={entry.id}
                width={cardWidth}
                onPress={onCreateWishlist}
                accessibilityLabel={t("Create wishlist")}
              />
            ) : (
              <WishlistCard
                key={entry.id}
                wishlist={entry}
                width={cardWidth}
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
                  entry.is_owner
                    ? () => onOpenSheet({ type: "delete", wishlist: entry })
                    : undefined
                }
              />
            ),
          )}
        </View>
      ),
    [
      cardWidth,
      contentWidth,
      gridGap,
      insets.top,
      onCreateWishlist,
      onOpenSheet,
      query.isFetching,
      StickyHeaderComponent,
      t,
    ],
  );

  return (
    <StyledFlashList
      data={data}
      renderItem={renderRow}
      keyExtractor={(row) => ("type" in row ? row.id : row.map((entry) => entry.id).join(":"))}
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1"
      contentContainerClassName="pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 24 }}
      ItemSeparatorComponent={RowSeparator}
      ListHeaderComponent={
        <View className="mb-0 max-w-[1200px] self-center" style={{ width: contentWidth }}>
          {ListHeaderComponent}
        </View>
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
            <InlineState width={contentWidth} message={t("No wishlists match your filters.")} />
          ) : null}
          {pagination.showPagination ? (
            <PaginationControls
              page={page}
              total={pagination.totalForPagination}
              hasPrevPage={pagination.hasPrevPage}
              hasNextPage={pagination.hasNextPage}
              onChange={onPageChange}
            />
          ) : null}
        </View>
      }
      extraData={{
        cardWidth,
        contentWidth,
        gridGap,
        isFetching: query.isFetching,
        safeAreaTop: insets.top,
        StickyHeaderComponent,
      }}
      stickyHeaderIndices={[0]}
    />
  );
}

export function WishlistListStatsRow() {
  const { width } = useWindowDimensions();
  const { data, isError, isLoading } = useMyStatistics();
  const t = useGT();
  const gap = 12;
  const cardWidth = (Math.min(width - 32, 1200) - gap) / 2;
  const stats = [
    { label: t("Wishlists"), value: data?.wishlists_count ?? 0, icon: ListChecks },
    { label: t("Total Items"), value: data?.total_items_count ?? 0, icon: Package },
    { label: t("Reserved"), value: data?.reserved_items_count ?? 0, icon: LockKeyhole },
    { label: t("Purchased"), value: data?.purchased_items_count ?? 0, icon: ShoppingBag },
  ];

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
    <View className="flex-row flex-wrap" style={{ gap }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm"
          style={{ width: cardWidth }}
        >
          <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
            <Icon as={stat.icon} className="size-4 text-brand" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-extrabold text-text">{stat.value}</Text>
            <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
              {stat.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
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
          <Skeleton className="h-[120px] rounded-none" />
          <View className="gap-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

function RowSeparator({ leadingItem }: { leadingItem?: WishlistListRow }) {
  if (leadingItem && "type" in leadingItem) {
    return null;
  }

  return <View className="h-4" />;
}

function WishlistCard({
  wishlist,
  width,
  onEdit,
  onAddItem,
  onDelete,
}: {
  wishlist: Wishlist;
  width: number;
  onEdit?: () => void;
  onAddItem?: () => void;
  onDelete?: () => void;
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
  const { theme } = useUniwind();
  const mode = getThemeMode(theme);
  const accentGradientColors = getWishlistAccentGradientColors(wishlist.accent_type, mode);

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
            className="overflow-hidden rounded-xl border border-border-subtle bg-card-bg shadow-sm"
            pressedScale={0.98}
          >
            <View className="h-[120px] items-center justify-center overflow-hidden">
              <LinearGradient
                colors={accentGradientColors}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                className="absolute inset-0"
              />
              {wishlist.image_url ? (
                <StyledImage
                  source={{ uri: wishlist.image_url }}
                  contentFit="cover"
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
              className="absolute right-4 top-[132px] size-10 opacity-0"
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

function PaginationControls({
  page,
  total,
  hasPrevPage,
  hasNextPage,
  onChange,
}: {
  page: number;
  total: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="icon"
        disabled={!hasPrevPage}
        onPress={() => onChange(Math.max(1, page - 1))}
      >
        <Icon as={ChevronLeft} className="size-4 text-text" />
      </Button>
      {Array.from({ length: total }, (_, index) => index + 1).map((item) => (
        <Button
          key={item}
          variant={item === page ? "default" : "outline"}
          size="icon"
          onPress={() => onChange(item)}
        >
          <Text>{item}</Text>
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        disabled={!hasNextPage}
        onPress={() => onChange(page + 1)}
      >
        <Icon as={ChevronRight} className="size-4 text-text" />
      </Button>
    </View>
  );
}
