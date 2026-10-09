import { InlineState } from "@/components/shared/inline-state";
import { FloatingBackButton } from "@/components/ui/floating-back-button";
import { useSlideOutPanel } from "@/components/ui/slide-out-filter-panel";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { Text } from "@/components/ui/text";
import { WishlistItemDeleteSheet } from "@/components/wishlist-details/sheets/wishlist-item-delete-sheet";
import { WishlistItemDetailSheet } from "@/components/wishlist-details/sheets/wishlist-item-detail-sheet";
import { WishlistItemCreateEditSheet } from "@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet";
import { SaveItemToWishlistsSheet } from "@/components/wishlist-details/sheets/save-item-to-wishlists-sheet";
import { WishlistItemHeader } from "@/components/wishlist-details/wishlist-item-header";
import { WishlistItemCard } from "@/components/wishlist-details/wishlist-item-card";
import { useShowOwnReservations } from "@/hooks/use-own-reservations";
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
import { errorMessage } from "@/lib/errors";
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
import { AnimatedListCard, useListCardRemoval } from "@/lib/card-motion";
import type { Item } from "@wishlist/backend/types/item";
import type { FlashListRef } from "@shopify/flash-list";
import type { Wishlist } from "@wishlist/backend/types/wishlist";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View, useWindowDimensions } from "react-native";
import { CardGridSkeleton, DetailSkeleton } from "@/components/ui/list-skeletons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMPTY_FILTERS: WishlistItemFilterState = {
  search: "",
  statuses: [],
  priorities: [],
  priceMin: "",
  priceMax: "",
  sort: DEFAULT_ITEM_SORT,
};

const SHARE_BASE_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://wishlane.net").replace(
  /\/$/,
  "",
);

type SheetState =
  | { type: "edit"; item: Item }
  | { type: "detail"; item: Item }
  | { type: "save"; item: Item }
  | { type: "delete"; item: Item }
  | { type: "editWishlist"; wishlist: Wishlist }
  | { type: "deleteWishlist"; wishlist: Wishlist }
  | { type: "grantAccess"; wishlist: Wishlist }
  | null;

type WishlistItemListRow = Item[];

function getItemRowKey(row: WishlistItemListRow) {
  return row.map((entry) => entry.id).join(":");
}

export default function WishlistDetailScreen() {
  const t = useGT();
  const router = useRouter();
  const screenRef = React.useRef<View>(null);
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
  const {
    open: filtersOpen,
    setOpen: setFiltersOpen,
    progress: filtersProgress,
  } = useSlideOutPanel();
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
  // The mutation results get a new identity once their observers subscribe after mount;
  // depending on them re-rendered every item row right as the screen was opening.
  const { mutate: mutateVote } = toggleVote;
  const { mutate: mutateReservation, isPending: reservationPending } = toggleReservation;
  const { mutate: mutateBought, isPending: boughtPending } = toggleBought;
  const completeShareStep = useUserGuideStepCompletion(USER_GUIDE_STEP_IDS.shareWishlist);
  const { activeTargetId, requestMeasure } = useUserGuideTargetRegistration();
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
  const canSeeOwnReservations = useShowOwnReservations();
  // Owner only, not editors: the preference is about your own wishlists.
  const showOwnerReservation = Boolean(wishlist?.is_owner) && canSeeOwnReservations;
  const listRef = React.useRef<FlashListRef<WishlistItemListRow>>(null);
  const visibleItemIds = React.useMemo(() => items.map((item) => item.id), [items]);
  const { exitingIds, removedIds } = useListCardRemoval(
    "item",
    () => listRef.current?.prepareForLayoutAnimationRender(),
    visibleItemIds,
  );
  const itemRows = React.useMemo(
    () =>
      chunkRows(
        items.filter((item) => !removedIds.has(item.id)),
        columns,
      ),
    [columns, items, removedIds],
  );
  const itemListData = React.useMemo<WishlistItemListRow[]>(
    () => (itemsQuery.isLoading ? [] : itemRows),
    [itemRows, itemsQuery.isLoading],
  );
  const listExtraData = React.useMemo(
    () => ({ cardWidth, contentWidth, exitingIds, gridGap }),
    [cardWidth, contentWidth, exitingIds, gridGap],
  );
  const contentContainerStyle = React.useMemo(() => ({ paddingBottom }), [paddingBottom]);

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
      const link = `${SHARE_BASE_URL}/share?token=${encodeURIComponent(token)}`;
      setShareWishlist(wishlist);
      setShareLink(link);
      setShareGuideCompletionPending(true);
    } catch (error) {
      setShareFeedback({
        variant: "error",
        title: t("Share failed"),
        description: errorMessage(error, t("Could not create share link.")),
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

  // Header and filters live in the list header rather than as list rows: it flows above
  // the recycled cells, so when the filter panel animates its height the cells slide
  // with it on the UI thread. As rows, FlashList would only reposition them after
  // re-measuring — a beat behind the panel, and in jumps.
  const listHeader = wishlist ? (
    <View>
      <WishlistItemHeader
        wishlist={wishlist}
        isOwner={wishlist.is_owner}
        onEdit={canEditWishlist ? () => setSheet({ type: "editWishlist", wishlist }) : undefined}
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
                setSheet({ type: "grantAccess", wishlist });
              }
            : undefined
        }
        manageAccessLocked={isGated}
        topInset={insets.top}
      />
      <View className="z-2 bg-bg pb-4 pt-4">
        <View className="max-w-300 self-center" style={{ width: contentWidth }}>
          <WishlistItemFilterBar
            filters={filters}
            itemsCount={wishlist.items_count ?? 0}
            onChange={updateFilters}
            onReset={resetFilters}
            open={filtersOpen}
            progress={filtersProgress}
            onOpenChange={setFiltersOpen}
          />
        </View>
      </View>
    </View>
  ) : null;

  const renderItemRow = React.useCallback(
    ({ item }: { item: WishlistItemListRow }) => (
      <View
        className="flex-row"
        style={{
          alignSelf: "center",
          gap: gridGap,
          width: contentWidth,
        }}
      >
        {item.map((entry) => (
          <AnimatedListCard
            kind="item"
            id={entry.id}
            key={entry.id}
            exiting={exitingIds.has(entry.id)}
            style={{ width: cardWidth }}
          >
            <WishlistItemCard
              item={entry}
              width={cardWidth}
              currentUserId={currentUser.data}
              isOwner={canEditWishlist}
              showDiscountBadge={showDiscountBadge}
              showOwnerReservation={showOwnerReservation}
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
              onToggleVote={canEditWishlist ? undefined : () => mutateVote(entry.id)}
              // Owners included: you can mark your own gift reserved or bought.
              onToggleReserve={() => mutateReservation(entry.id)}
              onToggleBought={() => mutateBought(entry.id)}
              reservePending={reservationPending}
              boughtPending={boughtPending}
            />
          </AnimatedListCard>
        ))}
      </View>
    ),
    [
      canEditWishlist,
      cardWidth,
      contentWidth,
      currentUser.data,
      exitingIds,
      gridGap,
      profileNamesById,
      showDiscountBadge,
      showOwnerReservation,
      mutateVote,
      mutateReservation,
      mutateBought,
      reservationPending,
      boughtPending,
      votesQuery.data,
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
      <View ref={screenRef} collapsable={false} className="flex-1 bg-bg">
        {wishlistQuery.isLoading ? (
          <View className="flex-1 px-4 pt-6">
            <DetailSkeleton width={contentWidth} />
          </View>
        ) : wishlistQuery.isError || !wishlist ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-sm font-semibold text-text-muted">
              {t("Failed to load wishlist.")}
            </Text>
          </View>
        ) : (
          <StyledFlashList
            progressViewOffset={insets.top}
            onRefresh={() =>
              Promise.all([
                wishlistQuery.refetch(),
                itemsQuery.refetch(),
                votesQuery.refetch(),
                profilesQuery.refetch(),
              ])
            }
            listRef={listRef}
            data={itemsQuery.isError ? [] : itemListData}
            renderItem={renderItemRow}
            keyExtractor={getItemRowKey}
            className="flex-1"
            contentContainerClassName="bg-bg"
            contentContainerStyle={contentContainerStyle}
            onScroll={
              activeTargetId && !activeTargetId.startsWith("nav-") ? requestMeasure : undefined
            }
            scrollEventThrottle={
              activeTargetId && !activeTargetId.startsWith("nav-") ? 16 : undefined
            }
            ItemSeparatorComponent={ItemRowSeparator}
            onEndReached={loadMoreItems}
            isLoadingMore={itemsQuery.isFetchingNextPage}
            ListHeaderComponent={listHeader}
            ListFooterComponent={
              <View
                className="gap-5"
                style={{ alignSelf: "center", maxWidth: 1200, width: contentWidth }}
              >
                {itemsQuery.isLoading ? (
                  <CardGridSkeleton cardWidth={cardWidth} gridGap={gridGap} />
                ) : null}
                {itemsQuery.isError ? <InlineState message={t("Failed to load items.")} /> : null}
                {!itemsQuery.isLoading && !itemsQuery.isError && items.length === 0 ? (
                  <InlineState
                    mascot={
                      filtersActive && hasAnyItems
                        ? "magnifying-glass"
                        : canEditWishlist
                          ? "gift-in-hands"
                          : undefined
                    }
                    message={
                      filtersActive && hasAnyItems
                        ? t("No items match your filters.")
                        : t("No items yet.")
                    }
                    // Only someone who can add items is pointed at the "+" button.
                    pointToCreateButton={canEditWishlist && !(filtersActive && hasAnyItems)}
                    pointerScreenRef={screenRef}
                  />
                ) : null}
              </View>
            }
            extraData={listExtraData}
          />
        )}
        <FloatingBackButton />
        {sheet?.type === "edit" ? (
          <WishlistItemCreateEditSheet
            mode="edit"
            wishlistId={wishlistId}
            item={sheet?.type === "edit" ? sheet.item : undefined}
            open={sheet?.type === "edit"}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
          />
        ) : null}
        {sheet?.type === "editWishlist" ? (
          <WishlistCreateEditSheet
            mode="edit"
            open={sheet?.type === "editWishlist"}
            wishlist={sheet?.type === "editWishlist" ? sheet.wishlist : undefined}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
          />
        ) : null}
        {sheet?.type === "deleteWishlist" ? (
          <WishlistDeleteSheet
            wishlist={sheet?.type === "deleteWishlist" ? sheet.wishlist : null}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
            onDeleted={() => router.replace("/wishlists")}
          />
        ) : null}
        {sheet?.type === "grantAccess" ? (
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
        ) : null}
        {shareFeedback !== null ? (
          <ShareFeedbackSheet
            feedback={shareFeedback}
            onOpenChange={(open) => {
              if (!open) {
                setShareFeedback(null);
              }
            }}
          />
        ) : null}
        {shareWishlist !== null && shareLink !== null ? (
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
        ) : null}
        {sheet?.type === "detail" ? (
          <WishlistItemDetailSheet
            item={sheet?.type === "detail" ? sheet.item : null}
            currentUserId={currentUser.data}
            isOwner={canEditWishlist}
            showOwnerReservation={showOwnerReservation}
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
        ) : null}
        {sheet?.type === "save" ? (
          <SaveItemToWishlistsSheet
            item={sheet?.type === "save" ? sheet.item : null}
            onClose={() => setSheet(null)}
          />
        ) : null}
        {sheet?.type === "delete" ? (
          <WishlistItemDeleteSheet
            item={sheet?.type === "delete" ? sheet.item : null}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
          />
        ) : null}
      </View>
    </>
  );
}

function ItemRowSeparator() {
  return <View className="h-4" />;
}
