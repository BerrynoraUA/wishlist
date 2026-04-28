import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { DeleteItemSheet } from "@/components/wishlists/delete-item-sheet";
import { WishlistDetailHeader } from "@/components/wishlists/wishlist-detail-header";
import { WishlistItemCard } from "@/components/wishlists/wishlist-item-card";
import { WishlistItemDetailSheet } from "@/components/wishlists/wishlist-item-detail-sheet";
import { WishlistItemFormSheet } from "@/components/wishlists/wishlist-item-form-sheet";
import {
  wishlistCardFadeIn,
  wishlistGridLinearTransition,
} from "@/components/wishlists/wishlist-screen-animations";
import {
  hasWishlistItemFilters,
  WishlistItemToolbar,
  type WishlistItemFilterState,
} from "@/components/wishlists/wishlist-item-toolbar";
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
  ITEM_PRIORITY_OPTIONS,
  ITEM_STATUS_OPTIONS,
  WISHLIST_ITEMS_PAGE_SIZE,
  parseOptionalNumber,
} from "@/lib/items";
import { paginationFlags } from "@/lib/wishlists";
import type { Item } from "@wishlist/backend/types/item";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { Plus } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";

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
  | null;

export default function WishlistDetailScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
  const wishlistId = rawId === "index" ? "" : rawId;
  const wishlistQuery = useWishlistById(wishlistId);
  const wishlist = wishlistQuery.data;
  const currentUser = useCurrentUserId();
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<WishlistItemFilterState>(EMPTY_FILTERS);
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
      const status = ITEM_STATUS_OPTIONS.find((option) => option.value === value)?.status;
      if (status !== undefined) statuses.push(status);
    }

    const priorities: number[] = [];
    for (const value of filters.priorities) {
      const priority = ITEM_PRIORITY_OPTIONS.find((option) => option.value === value)?.priority;
      if (priority !== undefined) priorities.push(priority);
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
        (profile) => [profile.id, profile.display_name || profile.nickname || "Someone"] as const,
      ) ?? [];

    return new Map(entries);
  }, [profilesQuery.data]);
  const filtersActive = hasWishlistItemFilters(filters);
  const hasAnyItems = (allItemsQuery.data?.length ?? 0) > 0;
  const pagination = paginationFlags(page, items.length, WISHLIST_ITEMS_PAGE_SIZE);
  const contentWidth = Math.min(width - 32, 1200);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const showDiscountBadge = !canEditWishlist && Boolean(friendshipQuery.data);

  function updateFilters(patch: Partial<WishlistItemFilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch("");
    setPage(1);
  }

  if (rawId === "index") {
    return (
      <>
        <Stack.Screen options={{ title: "Wishlists" }} />
        <Redirect href="/wishlists" />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: wishlist?.title ?? "Wishlist" }} />
      <View className="flex-1 bg-bg">
        {wishlistQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : wishlistQuery.isError || !wishlist ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-sm font-semibold text-text-muted">
              Failed to load wishlist.
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerClassName="items-center pb-safe-offset-8"
          >
            <WishlistDetailHeader wishlist={wishlist} isOwner={wishlist.is_owner} />
            <View className="w-full gap-5 px-4 pt-5" style={{ maxWidth: 1200 }}>
              <WishlistItemToolbar
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
                onAddItem={canEditWishlist ? () => setSheet({ type: "create" }) : undefined}
              />

              {itemsQuery.isLoading ? (
                <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                  <ActivityIndicator />
                </View>
              ) : itemsQuery.isError ? (
                <InlineState message="Failed to load items." />
              ) : items.length === 0 ? (
                <EmptyItemsState canAdd={canEditWishlist} filtered={filtersActive && hasAnyItems} />
              ) : (
                <Animated.View
                  className="flex-row flex-wrap"
                  layout={wishlistGridLinearTransition}
                  style={{ gap: gridGap, opacity: itemsQuery.isFetching ? 0.6 : 1 }}
                >
                  {items.map((item) => (
                    <Animated.View
                      key={item.id}
                      entering={wishlistCardFadeIn}
                      style={{ width: cardWidth }}
                    >
                      <WishlistItemCard
                        item={item}
                        width={cardWidth}
                        currentUserId={currentUser.data}
                        isOwner={canEditWishlist}
                        showDiscountBadge={showDiscountBadge}
                        reservedByName={
                          item.reserved_by ? profileNamesById.get(item.reserved_by) : undefined
                        }
                        voteCount={votesQuery.data?.counts[item.id] ?? 0}
                        hasVoted={votesQuery.data?.userVotes.has(item.id) ?? false}
                        onPress={() => setSheet({ type: "detail", item })}
                        onEdit={
                          canEditWishlist ? () => setSheet({ type: "edit", item }) : undefined
                        }
                        onDelete={
                          canEditWishlist ? () => setSheet({ type: "delete", item }) : undefined
                        }
                        onToggleVote={
                          canEditWishlist ? undefined : () => toggleVote.mutate(item.id)
                        }
                      />
                    </Animated.View>
                  ))}

                  {canEditWishlist ? (
                    <AddItemCard width={cardWidth} onPress={() => setSheet({ type: "create" })} />
                  ) : null}
                </Animated.View>
              )}

              {pagination.showPagination ? (
                <View className="flex-row items-center justify-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    disabled={!pagination.hasPrevPage}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <Text>Previous</Text>
                  </Button>
                  <Text className="px-2 text-sm font-bold text-text-muted">{page}</Text>
                  <Button
                    variant="outline"
                    disabled={!pagination.hasNextPage}
                    onPress={() => setPage((current) => current + 1)}
                  >
                    <Text>Next</Text>
                  </Button>
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}
        <WishlistItemFormSheet
          mode={sheet?.type === "edit" ? "edit" : "create"}
          wishlistId={wishlistId}
          item={sheet?.type === "edit" ? sheet.item : undefined}
          open={sheet?.type === "create" || sheet?.type === "edit"}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
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
        <DeleteItemSheet
          item={sheet?.type === "delete" ? sheet.item : null}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
        />
      </View>
    </>
  );
}

function EmptyItemsState({ canAdd, filtered }: { canAdd: boolean; filtered: boolean }) {
  return (
    <View className="items-center gap-3 rounded-xl border border-border-subtle bg-card-bg p-8">
      <Text className="text-center text-base font-extrabold text-text">
        {filtered ? "No items match your filters." : "No items yet."}
      </Text>
      {canAdd && !filtered ? (
        <Text className="text-center text-sm text-text-muted">
          Use Add Item above to get started.
        </Text>
      ) : null}
    </View>
  );
}

function AddItemCard({ width, onPress }: { width: number; onPress: () => void }) {
  return (
    <Button
      variant="outline"
      onPress={onPress}
      className="h-[216px] flex-col rounded-xl border-dashed border-border-subtle bg-card-bg"
      style={{ width }}
    >
      <View className="size-14 items-center justify-center rounded-full border border-dashed border-brand/50 bg-brand-lighter">
        <Icon as={Plus} className="size-7 text-brand" />
      </View>
      <Text className="font-bold text-text">Add Item</Text>
    </Button>
  );
}

function InlineState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6">
      <Text className="text-center text-sm font-semibold text-text-muted">{message}</Text>
    </View>
  );
}
