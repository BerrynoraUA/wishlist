import { InlineState } from "@/components/shared/inline-state";
import { FloatingBackButton } from "@/components/ui/floating-back-button";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { WishlistItemDeleteSheet } from "@/components/wishlist-details/sheets/wishlist-item-delete-sheet";
import { WishlistItemDetailSheet } from "@/components/wishlist-details/sheets/wishlist-item-detail-sheet";
import { WishlistItemCreateEditSheet } from "@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet";
import { SaveItemToWishlistsSheet } from "@/components/wishlist-details/sheets/save-item-to-wishlists-sheet";
import { WishlistItemHeader } from "@/components/wishlist-details/wishlist-item-header";
import { WishlistItemCard } from "@/components/wishlist-details/wishlist-item-card";
import {
  useUserGuideStepCompletion,
  useUserGuideTargetRegistration,
} from "@/components/user-guide/user-guide-provider";
import { USER_GUIDE_STEP_IDS } from "@/components/user-guide/user-guide-config";
import {
  wishlistItemFilterBarHasActiveFilters,
  WishlistItemFilterBar,
  type WishlistItemFilterState,
} from "@/components/wishlist-details/wishlist-item-filter-bar";
import { wishlistCardFadeIn } from "@/components/wishlists/wishlist-grid-animations";
import { WishlistDeleteSheet } from "@/components/wishlists/sheets/wishlist-delete-sheet";
import { WishlistCreateEditSheet } from "@/components/wishlists/sheets/wishlist-create-edit-sheet";
import {
  ShareFeedbackSheet,
  type ShareFeedback,
} from "@/components/wishlists/sheets/share-feedback-sheet";
import { WishlistShareSheet } from "@/components/wishlists/sheets/wishlist-share-sheet";
import { WishlistGrantAccessSheet } from "@/components/wishlists/sheets/wishlist-grant-access-sheet";
import { createWishlistShareToken } from "@/api/share";
import { useCheckFriendship, useProfilesByIds } from "@/hooks/use-friends";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
import { useProGate } from "@/hooks/use-pro-gate";
import {
  useItemVotes,
  useInfiniteWishlistItems,
  useToggleItemBought,
  useToggleItemReservation,
  useToggleItemVote,
} from "@/hooks/use-items";
import { useCurrentUserId } from "@/hooks/use-user";
import { useWishlistById } from "@/hooks/use-wishlists";
import {
  DEFAULT_ITEM_SORT,
  ITEM_PRIORITY_LOOKUP,
  ITEM_STATUS_LOOKUP,
  WISHLIST_ITEMS_PAGE_SIZE,
  parseOptionalNumber,
  optimisticallyToggleItemBought,
  optimisticallyToggleItemReservation,
  updateItemIfSelected,
} from "@/lib/items";
import { chunkRows, useTabBarContentPadding } from "@/lib/layout";
import type { Item } from "@wishlist/backend/types/item";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
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
  | { type: "edit"; item: Item }
  | { type: "detail"; item: Item }
  | { type: "save"; item: Item }
  | { type: "delete"; item: Item }
  | { type: "editWishlist"; wishlist: Wishlist }
  | { type: "deleteWishlist"; wishlist: Wishlist }
  | { type: "grantAccess"; wishlist: Wishlist }
  | null;

type WishlistItemListRow =
  | Item[]
  | { id: "header"; type: "header" }
  | { id: "filters"; type: "filters" };

export default function WishlistDetailScreen() {
  const t = useGT();
  const router = useRouter();
  const { isGated, openPaywall } = useProGate();
  const insets = useSafeAreaInsets();
  const paddingBottom = useTabBarContentPadding();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
  const wishlistId = rawId === "index" ? "" : rawId;
  const wishlistQuery = useWishlistById(wishlistId);
  const wishlist = wishlistQuery.data;
  const currentUser = useCurrentUserId();
  const [filters, setFilters] = React.useState<WishlistItemFilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sheet, setSheet] = React.useState<SheetState>(null);
  const [shareFeedback, setShareFeedback] = React.useState<ShareFeedback>(null);
  const [shareLink, setShareLink] = React.useState<string | null>(null);
  const [shareWishlist, setShareWishlist] = React.useState<Wishlist | null>(null);
  const [shareGuideCompletionPending, setShareGuideCompletionPending] = React.useState(false);
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
      search: debouncedSearch,
      sort: filters.sort,
      statuses,
      priorities,
      priceMin: parseOptionalNumber(filters.priceMin),
      priceMax: parseOptionalNumber(filters.priceMax),
    };
  }, [debouncedSearch, filters]);

  const itemsQuery = useInfiniteWishlistItems(
    wishlistId,
    itemQueryParams,
    WISHLIST_ITEMS_PAGE_SIZE,
  );
  const { items, loadMore: loadMoreItems } = useInfiniteListData(itemsQuery);
  const itemIds = React.useMemo(() => items.map((item) => item.id), [items]);
  const votesQuery = useItemVotes(itemIds);
  const toggleVote = useToggleItemVote(itemIds);
  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();
  const completeShareStep = useUserGuideStepCompletion(USER_GUIDE_STEP_IDS.shareWishlist);
  const completeManageAccessStep = useUserGuideStepCompletion(
    USER_GUIDE_STEP_IDS.manageWishlistAccess,
  );
  const { requestMeasure } = useUserGuideTargetRegistration();
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
  const hasAnyItems = (wishlist?.items_count ?? 0) > 0;
  const contentWidth = Math.min(width - 32, 1200);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;
  const showDiscountBadge = !canEditWishlist && Boolean(friendshipQuery.data);
  const itemRows = React.useMemo(() => chunkRows(items, columns), [columns, items]);
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
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch("");
  }

  const handleShareWishlist = React.useCallback(async () => {
    if (!wishlist) return;
    try {
      const token = await createWishlistShareToken(wishlist.id);
      const baseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://wishlane.net").replace(
        /\/$/,
        "",
      );
      const link = `${baseUrl}/share?token=${encodeURIComponent(token)}`;
      setShareWishlist(wishlist);
      setShareLink(link);
      setShareGuideCompletionPending(true);
    } catch (error) {
      setShareFeedback({
        variant: "error",
        title: t("Share failed"),
        description: error instanceof Error ? error.message : t("Could not create share link."),
      });
      setShareGuideCompletionPending(false);
    }
  }, [t, wishlist]);

  function handleToggleSelectedReservation(itemId: string) {
    if (sheet?.type !== "detail" || sheet.item.id !== itemId) return;

    const previousItem = sheet.item;
    setSheet({
      type: "detail",
      item: optimisticallyToggleItemReservation(previousItem, currentUser.data),
    });
    toggleReservation.mutate(itemId, {
      onError: () =>
        setSheet((current) =>
          current?.type === "detail"
            ? {
                type: "detail",
                item: updateItemIfSelected(current.item, itemId, () => previousItem),
              }
            : current,
        ),
      onSuccess: (item) =>
        setSheet((current) =>
          current?.type === "detail" && current.item.id === itemId
            ? { type: "detail", item: { ...current.item, ...item } }
            : current,
        ),
    });
  }

  function handleToggleSelectedBought(itemId: string) {
    if (sheet?.type !== "detail" || sheet.item.id !== itemId) return;

    const previousItem = sheet.item;
    setSheet({
      type: "detail",
      item: optimisticallyToggleItemBought(previousItem, currentUser.data),
    });
    toggleBought.mutate(itemId, {
      onError: () =>
        setSheet((current) =>
          current?.type === "detail"
            ? {
                type: "detail",
                item: updateItemIfSelected(current.item, itemId, () => previousItem),
              }
            : current,
        ),
      onSuccess: (item) =>
        setSheet((current) =>
          current?.type === "detail" && current.item.id === itemId
            ? { type: "detail", item: { ...current.item, ...item } }
            : current,
        ),
    });
  }

  function renderFilterHeader() {
    return (
      <View className="z-2 bg-bg pb-4 pt-4">
        <View className="max-w-300 self-center" style={{ width: contentWidth }}>
          <WishlistItemFilterBar
            filters={filters}
            itemsCount={wishlist?.items_count ?? 0}
            onChange={updateFilters}
            onReset={resetFilters}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
          />
        </View>
      </View>
    );
  }

  const renderItemRow = React.useCallback(
    ({ item }: { item: WishlistItemListRow }) =>
      "type" in item && item.type === "header" ? (
        wishlist ? (
          <View>
            <WishlistItemHeader
              wishlist={wishlist}
              isOwner={wishlist.is_owner}
              onEdit={
                canEditWishlist ? () => setSheet({ type: "editWishlist", wishlist }) : undefined
              }
              onDelete={
                wishlist.is_owner ? () => setSheet({ type: "deleteWishlist", wishlist }) : undefined
              }
              onShare={handleShareWishlist}
              onManageAccess={
                wishlist.is_owner
                  ? () => {
                      if (isGated) {
                        openPaywall();
                        return;
                      }
                      completeManageAccessStep();
                      setSheet({ type: "grantAccess", wishlist });
                    }
                  : undefined
              }
              manageAccessLocked={isGated}
              topInset={insets.top}
            />
          </View>
        ) : null
      ) : "type" in item ? (
        renderFilterHeader()
      ) : (
        <View
          className="flex-row"
          style={{
            alignSelf: "center",
            gap: gridGap,
            width: contentWidth,
          }}
        >
          {item.map((entry) => (
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
                onEdit={canEditWishlist ? () => setSheet({ type: "edit", item: entry }) : undefined}
                onDelete={
                  canEditWishlist ? () => setSheet({ type: "delete", item: entry }) : undefined
                }
                onToggleVote={canEditWishlist ? undefined : () => toggleVote.mutate(entry.id)}
                onToggleReserve={
                  canEditWishlist ? undefined : () => toggleReservation.mutate(entry.id)
                }
                onToggleBought={canEditWishlist ? undefined : () => toggleBought.mutate(entry.id)}
                reservePending={toggleReservation.isPending}
                boughtPending={toggleBought.isPending}
              />
            </Animated.View>
          ))}
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
      handleShareWishlist,
      insets.top,
      isGated,
      openPaywall,
      profileNamesById,
      showDiscountBadge,
      toggleVote,
      toggleReservation,
      toggleBought,
      votesQuery.data,
      wishlist,
      t,
      completeManageAccessStep,
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
          <StyledFlashList
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
            className="flex-1"
            contentContainerClassName="bg-bg"
            contentContainerStyle={{ paddingBottom }}
            onScroll={requestMeasure}
            scrollEventThrottle={16}
            ItemSeparatorComponent={ItemRowSeparator}
            onEndReached={loadMoreItems}
            isLoadingMore={itemsQuery.isFetchingNextPage}
            getItemType={(row) => ("type" in row ? row.type : "item-row")}
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
                {!itemsQuery.isLoading && !itemsQuery.isError && items.length === 0 ? (
                  <InlineState
                    mascot={filtersActive && hasAnyItems ? "magnifying-glass" : "gift-in-hands"}
                    message={
                      filtersActive && hasAnyItems
                        ? t("No items match your filters.")
                        : t("No items yet.")
                    }
                    pointToCreateButton={!(filtersActive && hasAnyItems)}
                  />
                ) : null}
              </View>
            }
            extraData={{
              cardWidth,
              contentWidth,
              filters,
              filtersOpen,
              gridGap,
            }}
          />
        )}
        <FloatingBackButton />
        <WishlistItemCreateEditSheet
          mode="edit"
          wishlistId={wishlistId}
          item={sheet?.type === "edit" ? sheet.item : undefined}
          open={sheet?.type === "edit"}
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
        <WishlistGrantAccessSheet
          open={sheet?.type === "grantAccess"}
          wishlistId={sheet?.type === "grantAccess" ? sheet.wishlist.id : ""}
          wishlistTitle={sheet?.type === "grantAccess" ? sheet.wishlist.title : ""}
          onOpenChange={(open) => {
            if (!open) {
              setSheet(null);
            }
          }}
        />
        <ShareFeedbackSheet
          feedback={shareFeedback}
          onOpenChange={(open) => {
            if (!open) {
              setShareFeedback(null);
            }
          }}
        />
        <WishlistShareSheet
          wishlist={shareWishlist}
          link={shareLink}
          onOpenChange={(open) => {
            if (!open) {
              const shouldCompleteShareStep = shareGuideCompletionPending;

              setShareWishlist(null);
              setShareLink(null);
              setShareGuideCompletionPending(false);

              if (shouldCompleteShareStep) {
                completeShareStep();
              }
            }
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
          onSaveToWishlist={
            canEditWishlist ? undefined : (item) => setSheet({ type: "save", item })
          }
          onToggleReserve={handleToggleSelectedReservation}
          onToggleBought={handleToggleSelectedBought}
        />
        <SaveItemToWishlistsSheet
          item={sheet?.type === "save" ? sheet.item : null}
          onClose={() => setSheet(null)}
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

  return <View className="h-4" />;
}
