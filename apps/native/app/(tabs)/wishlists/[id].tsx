import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { InlineState } from "@/components/shared/inline-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { WishlistItemDeleteSheet } from "@/components/wishlist-details/sheets/wishlist-item-delete-sheet";
import { WishlistItemDetailSheet } from "@/components/wishlist-details/sheets/wishlist-item-detail-sheet";
import { WishlistItemCreateEditSheet } from "@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet";
import { WishlistItemHeader } from "@/components/wishlist-details/wishlist-item-header";
import { WishlistItemCard } from "@/components/wishlist-details/wishlist-item-card";
import {
  wishlistItemFilterBarHasActiveFilters,
  WishlistItemFilterBar,
  type WishlistItemFilterState,
} from "@/components/wishlist-details/wishlist-item-filter-bar";
import { AddCard } from "@/components/wishlists/add-card";
import { wishlistCardFadeIn } from "@/components/wishlists/wishlist-grid-animations";
import { WishlistDeleteSheet } from "@/components/wishlists/sheets/wishlist-delete-sheet";
import { WishlistCreateEditSheet } from "@/components/wishlists/sheets/wishlist-create-edit-sheet";
import { useCheckFriendship, useProfilesByIds } from "@/hooks/use-friends";
import {
  useItemVotes,
  useToggleItemBought,
  useToggleItemReservation,
  useToggleItemVote,
  useWishlistItems,
} from "@/hooks/use-items";
import { useCurrentUserId } from "@/hooks/use-user";
import { useWishlistById } from "@/hooks/use-wishlists";
import {
  DEFAULT_ITEM_SORT,
  ITEM_PRIORITY_LOOKUP,
  ITEM_STATUS_LOOKUP,
  WISHLIST_ITEMS_PAGE_SIZE,
  parseOptionalNumber,
} from "@/lib/items";
import { chunkRows } from "@/lib/layout";
import { paginationFlags } from "@/lib/wishlists";
import type { Item } from "@wishlist/backend/types/item";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { FlashList } from "@shopify/flash-list";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMPTY_FILTERS: WishlistItemFilterState = {
  search: "",
  statuses: [],
  priorities: [],
  priceMin: "",
  priceMax: "",
  sort: DEFAULT_ITEM_SORT,
};

type SheetState =
  | { type: "create" }
  | { type: "edit"; item: Item }
  | { type: "detail"; item: Item }
  | { type: "delete"; item: Item }
  | { type: "editWishlist"; wishlist: Wishlist }
  | { type: "deleteWishlist"; wishlist: Wishlist }
  | null;

type WishlistItemListEntry = Item | { id: "create"; type: "create" };
type WishlistItemListRow =
  | WishlistItemListEntry[]
  | { id: "header"; type: "header" }
  | { id: "filters"; type: "filters" };

export default function WishlistDetailScreen() {
  const t = useGT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
  const wishlistId = rawId === "index" ? "" : rawId;
  const wishlistQuery = useWishlistById(wishlistId);
  const wishlist = wishlistQuery.data;
  const currentUser = useCurrentUserId();
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<WishlistItemFilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const canEditWishlist = Boolean(wishlist?.is_owner || wishlist?.can_edit);
  const friendshipCheckUserId =
    !canEditWishlist && currentUser.data && wishlist?.user_id ? wishlist.user_id : "";
  const friendshipQuery = useCheckFriendship(friendshipCheckUserId);

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const itemQueryParams = React.useMemo(() => {
    const statuses: number[] = [];
    for (const value of filters.statuses) {
      const status = ITEM_STATUS_LOOKUP.find((option) => option.value === value)?.status;
      if (status !== undefined) statuses.push(status);
    }

    const priorities: string[] = [];
    for (const value of filters.priorities) {
      const priorityId = ITEM_PRIORITY_LOOKUP.find((option) => option.value === value)?.priority_id;
      if (priorityId !== undefined) priorities.push(priorityId);
    }

    return {
      skip: (page - 1) * WISHLIST_ITEMS_PAGE_SIZE,
      take: WISHLIST_ITEMS_PAGE_SIZE,
      search: debouncedSearch,
      sort: filters.sort,
      statuses,
      priorities,
      priceMin: parseOptionalNumber(filters.priceMin),
      priceMax: parseOptionalNumber(filters.priceMax),
    };
  }, [debouncedSearch, filters, page]);

  const itemsQuery = useWishlistItems(wishlistId, itemQueryParams);
  const allItemsQuery = useWishlistItems(wishlistId, { skip: 0, take: 1 });
  const items = itemsQuery.data ?? [];
  const itemIds = React.useMemo(() => items.map((item) => item.id), [items]);
  const votesQuery = useItemVotes(itemIds);
  const toggleVote = useToggleItemVote(itemIds);
  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();
  const reservedByIds = React.useMemo(
    () => [
      ...new Set(items.map((item) => item.reserved_by).filter((value): value is string => !!value)),
    ],
    [items],
  );
  const profilesQuery = useProfilesByIds(reservedByIds);
  const profileNamesById = React.useMemo(() => {
    const entries =
      profilesQuery.data?.map(
        (profile) =>
          [profile.id, profile.display_name || profile.nickname || t("Someone")] as const,
      ) ?? [];

    return new Map(entries);
  }, [profilesQuery.data, t]);
  const filtersActive = wishlistItemFilterBarHasActiveFilters(filters);
  const hasAnyItems = (allItemsQuery.data?.length ?? 0) > 0;
  const pagination = paginationFlags(page, items.length, WISHLIST_ITEMS_PAGE_SIZE);
  const contentWidth = Math.min(width - 32, 1200);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const showDiscountBadge = !canEditWishlist && Boolean(friendshipQuery.data);
  const itemListEntries = React.useMemo<WishlistItemListEntry[]>(
    () =>
      canEditWishlist && !itemsQuery.isError ? [...items, { id: "create", type: "create" }] : items,
    [canEditWishlist, items, itemsQuery.isError],
  );
  const itemRows = React.useMemo(
    () => chunkRows(itemListEntries, columns),
    [columns, itemListEntries],
  );
  const itemListData = React.useMemo<WishlistItemListRow[]>(
    () => [
      { id: "header", type: "header" },
      { id: "filters", type: "filters" },
      ...(itemsQuery.isLoading ? [] : itemRows),
    ],
    [itemRows, itemsQuery.isLoading],
  );

  function updateFilters(patch: Partial<WishlistItemFilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch("");
    setPage(1);
  }

  const renderItemRow = React.useCallback(
    ({ item, target }: { item: WishlistItemListRow; target: string }) =>
      "type" in item && item.type === "header" ? (
        wishlist ? (
          <View style={{ marginBottom: -insets.top }}>
            <WishlistItemHeader
              wishlist={wishlist}
              isOwner={wishlist.is_owner}
              onEdit={
                canEditWishlist ? () => setSheet({ type: "editWishlist", wishlist }) : undefined
              }
              onDelete={
                wishlist.is_owner ? () => setSheet({ type: "deleteWishlist", wishlist }) : undefined
              }
            />
          </View>
        ) : null
      ) : "type" in item ? (
        <View
          className={target === "StickyHeader" ? "bg-bg" : "bg-transparent"}
          style={[wishlistDetailStyles.stickyHeader, { paddingTop: insets.top + 16 }]}
        >
          <View style={[wishlistDetailStyles.stickyHeaderContent, { width: contentWidth }]}>
            <WishlistItemFilterBar
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              onAddItem={canEditWishlist ? () => setSheet({ type: "create" }) : undefined}
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
            />
          </View>
        </View>
      ) : (
        <View
          className="flex-row"
          style={{
            alignSelf: "center",
            gap: gridGap,
            opacity: itemsQuery.isFetching ? 0.6 : 1,
            width: contentWidth,
          }}
        >
          {item.map((entry) =>
            "type" in entry ? (
              <AddCard
                key={entry.id}
                width={cardWidth}
                onPress={() => setSheet({ type: "create" })}
                accessibilityLabel={t("Add item")}
              />
            ) : (
              <Animated.View
                key={entry.id}
                entering={wishlistCardFadeIn}
                style={{ width: cardWidth }}
              >
                <WishlistItemCard
                  item={entry}
                  width={cardWidth}
                  currentUserId={currentUser.data}
                  isOwner={canEditWishlist}
                  showDiscountBadge={showDiscountBadge}
                  reservedByName={
                    entry.reserved_by ? profileNamesById.get(entry.reserved_by) : undefined
                  }
                  voteCount={votesQuery.data?.counts[entry.id] ?? 0}
                  hasVoted={votesQuery.data?.userVotes.has(entry.id) ?? false}
                  onPress={() => setSheet({ type: "detail", item: entry })}
                  onEdit={
                    canEditWishlist ? () => setSheet({ type: "edit", item: entry }) : undefined
                  }
                  onDelete={
                    canEditWishlist ? () => setSheet({ type: "delete", item: entry }) : undefined
                  }
                  onToggleVote={canEditWishlist ? undefined : () => toggleVote.mutate(entry.id)}
                />
              </Animated.View>
            ),
          )}
        </View>
      ),
    [
      canEditWishlist,
      cardWidth,
      contentWidth,
      currentUser.data,
      filters,
      filtersOpen,
      gridGap,
      insets.top,
      itemsQuery.isFetching,
      profileNamesById,
      showDiscountBadge,
      toggleVote,
      votesQuery.data,
      wishlist,
      t,
    ],
  );

  if (rawId === "index") {
    return (
      <>
        <Stack.Screen options={{ title: t("Wishlists") }} />
        <Redirect href="/wishlists" />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: wishlist?.title ?? t("Wishlist") }} />
      <View className="flex-1 bg-bg">
        {wishlistQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : wishlistQuery.isError || !wishlist ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-sm font-semibold text-text-muted">
              {t("Failed to load wishlist.")}
            </Text>
          </View>
        ) : (
          <FlashList
            data={
              itemsQuery.isError
                ? [
                    { id: "header", type: "header" },
                    { id: "filters", type: "filters" },
                  ]
                : itemListData
            }
            renderItem={renderItemRow}
            keyExtractor={(row) =>
              "type" in row ? row.id : row.map((entry) => entry.id).join(":")
            }
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[
              wishlistDetailStyles.content,
              { paddingTop: insets.top + wishlistDetailStyles.content.paddingTop },
            ]}
            ItemSeparatorComponent={ItemRowSeparator}
            ListFooterComponent={
              <View
                className="gap-5"
                style={{ alignSelf: "center", maxWidth: 1200, width: contentWidth }}
              >
                {itemsQuery.isLoading ? (
                  <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                    <ActivityIndicator />
                  </View>
                ) : null}
                {itemsQuery.isError ? <InlineState message={t("Failed to load items.")} /> : null}
                {!itemsQuery.isLoading &&
                !itemsQuery.isError &&
                items.length === 0 &&
                !canEditWishlist ? (
                  <Text className="text-center text-sm text-text-muted">
                    {filtersActive && hasAnyItems
                      ? t("No items match your filters.")
                      : t("No items yet.")}
                  </Text>
                ) : null}
                {pagination.showPagination ? (
                  <View className="flex-row items-center justify-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      disabled={!pagination.hasPrevPage}
                      onPress={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <Text>{t("Previous")}</Text>
                    </Button>
                    <Text className="px-2 text-sm font-bold text-text-muted">{page}</Text>
                    <Button
                      variant="outline"
                      disabled={!pagination.hasNextPage}
                      onPress={() => setPage((current) => current + 1)}
                    >
                      <Text>{t("Next")}</Text>
                    </Button>
                  </View>
                ) : null}
              </View>
            }
            extraData={{
              cardWidth,
              contentWidth,
              filters,
              filtersOpen,
              gridGap,
              isFetching: itemsQuery.isFetching,
              safeAreaTop: insets.top,
            }}
            stickyHeaderIndices={[1]}
            style={wishlistDetailStyles.list}
          />
        )}
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          onPress={() => router.back()}
          className="absolute bottom-3 left-3 z-20 size-14 items-center justify-center rounded-full border border-glass-border bg-glass-bg"
          style={floatingBackButtonStyles.shadow}
        >
          <Icon as={ChevronLeft} className="size-7 text-text" />
        </AnimatedPressable>
        <WishlistItemCreateEditSheet
          mode={sheet?.type === "edit" ? "edit" : "create"}
          wishlistId={wishlistId}
          item={sheet?.type === "edit" ? sheet.item : undefined}
          open={sheet?.type === "create" || sheet?.type === "edit"}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <WishlistCreateEditSheet
          mode="edit"
          open={sheet?.type === "editWishlist"}
          wishlist={sheet?.type === "editWishlist" ? sheet.wishlist : undefined}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
        <WishlistDeleteSheet
          wishlist={sheet?.type === "deleteWishlist" ? sheet.wishlist : null}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onDeleted={() => router.replace("/wishlists")}
        />
        <WishlistItemDetailSheet
          item={sheet?.type === "detail" ? sheet.item : null}
          currentUserId={currentUser.data}
          isOwner={canEditWishlist}
          reservedByName={
            sheet?.type === "detail" && sheet.item.reserved_by
              ? profileNamesById.get(sheet.item.reserved_by)
              : undefined
          }
          reservePending={toggleReservation.isPending}
          boughtPending={toggleBought.isPending}
          onClose={() => setSheet(null)}
          onEdit={canEditWishlist ? (item) => setSheet({ type: "edit", item }) : undefined}
          onDelete={canEditWishlist ? (item) => setSheet({ type: "delete", item }) : undefined}
          onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
          onToggleBought={(itemId) => toggleBought.mutate(itemId)}
        />
        <WishlistItemDeleteSheet
          item={sheet?.type === "delete" ? sheet.item : null}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
      </View>
    </>
  );
}

function ItemRowSeparator({ leadingItem }: { leadingItem?: WishlistItemListRow }) {
  if (leadingItem && "type" in leadingItem) {
    return null;
  }

  return <View style={wishlistDetailStyles.rowSeparator} />;
}

const wishlistDetailStyles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingTop: 0,
  },
  stickyHeader: {
    paddingBottom: 16,
    zIndex: 2,
  },
  stickyHeaderContent: {
    alignSelf: "center",
    maxWidth: 1200,
  },
  rowSeparator: {
    height: 16,
  },
});

const floatingBackButtonStyles = StyleSheet.create({
  shadow: {
    shadowColor: "rgb(15, 23, 42)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 6,
  },
});
