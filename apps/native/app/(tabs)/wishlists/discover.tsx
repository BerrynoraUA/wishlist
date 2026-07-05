import {
  DiscoverFilterHeader,
  DiscoverFiltersPanel,
} from "@/components/discover/discover-filter-bar";
import { DiscoverSection } from "@/components/discover/discover-section";
import { DiscoverTabs } from "@/components/discover/discover-tabs";
import { ReservedItemsGrid } from "@/components/discover/reserved-items-grid";
import { DiscoverItemDetailSheet } from "@/components/discover/sheets/discover-item-detail-sheet";
import { UpcomingEventsCard } from "@/components/discover/upcoming-events-card";
import { InlineState } from "@/components/shared/inline-state";
import { FloatingBackButton } from "@/components/ui/floating-back-button";
import { SCROLLABLE_TABS_TOP_GAP } from "@/components/ui/scrollable-tabs";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { useUserGuideTargetRegistration } from "@/components/user-guide/user-guide-provider";
import { useDiscoverFeed } from "@/hooks/use-discover-feed";
import { useFriends } from "@/hooks/use-friends";
import { useToggleItemBought, useToggleItemReservation } from "@/hooks/use-items";
import {
  optimisticallyToggleItemBought,
  optimisticallyToggleItemReservation,
  updateItemIfSelected,
} from "@/lib/items";
import { useAuth } from "@/providers/auth-provider";
import type { DiscoverSection as DiscoverSectionType } from "@wishlist/backend/types/discover";
import type { Item } from "@wishlist/backend/types/item";
import { Stack } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DiscoverRow =
  | DiscoverSectionType
  | { id: "discover-header"; type: "discover-header" }
  | { id: "discover-intro"; type: "discover-intro" }
  | { id: "reserved-grid"; type: "reserved-grid" };

type SelectedDiscoverItem = {
  item: Item;
  reservedByName?: string | null;
};

export default function DiscoverScreen() {
  const t = useGT();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const feed = useDiscoverFeed();
  const friendsQuery = useFriends();
  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [selection, setSelection] = React.useState<SelectedDiscoverItem | null>(null);
  const { requestMeasure } = useUserGuideTargetRegistration();

  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 3 : 2;
  const cardWidth = (contentWidth - gridGap * (columns - 1)) / columns;
  const friends = friendsQuery.data ?? [];

  function handleToggleSelectedReservation(itemId: string) {
    if (!selection || selection.item.id !== itemId || !user?.id) return;

    const previousItem = selection.item;
    setSelection((current) =>
      current
        ? { ...current, item: optimisticallyToggleItemReservation(previousItem, user.id) }
        : current,
    );
    toggleReservation.mutate(itemId, {
      onError: () =>
        setSelection((current) =>
          current
            ? {
                ...current,
                item: updateItemIfSelected(current.item, itemId, () => previousItem),
              }
            : current,
        ),
      onSuccess: (item) =>
        setSelection((current) =>
          current?.item.id === itemId
            ? { ...current, item: { ...current.item, ...item } }
            : current,
        ),
    });
  }

  function handleToggleSelectedBought(itemId: string) {
    if (!selection || selection.item.id !== itemId || !user?.id) return;

    const previousItem = selection.item;
    setSelection((current) =>
      current
        ? { ...current, item: optimisticallyToggleItemBought(previousItem, user.id) }
        : current,
    );
    toggleBought.mutate(itemId, {
      onError: () =>
        setSelection((current) =>
          current
            ? {
                ...current,
                item: updateItemIfSelected(current.item, itemId, () => previousItem),
              }
            : current,
        ),
      onSuccess: (item) =>
        setSelection((current) =>
          current?.item.id === itemId
            ? { ...current, item: { ...current.item, ...item } }
            : current,
        ),
    });
  }

  function openItem(item: Item, reservedByName?: string | null) {
    setSelection({ item, reservedByName });
  }

  const avatarByKey = React.useMemo(() => {
    const map = new Map<string, string | null>();
    for (const friend of friends) {
      map.set(friend.friend_id, friend.avatar_url ?? null);
      if (friend.nickname) map.set(friend.nickname, friend.avatar_url ?? null);
    }
    return map;
  }, [friends]);

  const rows = React.useMemo<DiscoverRow[]>(() => {
    const contentRows: DiscoverRow[] = feed.sectionTab
      ? feed.activeSections
      : [{ id: "reserved-grid", type: "reserved-grid" }];

    return [
      { id: "discover-header", type: "discover-header" },
      { id: "discover-intro", type: "discover-intro" },
      ...contentRows,
    ];
  }, [feed.activeSections, feed.sectionTab, filtersOpen]);

  function renderFiltersPanel() {
    if (!filtersOpen) return null;

    return (
      <DiscoverFiltersPanel
        search={feed.search}
        priorityIds={feed.priorityIds}
        priceMin={feed.priceMin}
        priceMax={feed.priceMax}
        sort={feed.sort}
        onSearchChange={feed.setSearch}
        onPriorityToggle={feed.togglePriority}
        onPriceMinChange={feed.setPriceMin}
        onPriceMaxChange={feed.setPriceMax}
        onSortChange={feed.setSort}
      />
    );
  }

  function renderDiscoverHeader() {
    return (
      <View className="bg-bg pb-4" style={{ paddingTop: insets.top + SCROLLABLE_TABS_TOP_GAP }}>
        <View className="gap-4 self-center" style={{ width: contentWidth }}>
          <DiscoverTabs
            value={feed.tab}
            onChange={(value) => {
              feed.setTab(value);
              setSelection(null);
            }}
          />
          <DiscoverFilterHeader
            filtersOpen={filtersOpen}
            filtersActive={feed.filtersActive}
            onFiltersOpenChange={setFiltersOpen}
            onResetFilters={feed.resetFilters}
          />
          {renderFiltersPanel()}
        </View>
      </View>
    );
  }

  function renderRow({ item }: { item: DiscoverRow }) {
    if ("type" in item && item.type === "discover-header") {
      return renderDiscoverHeader();
    }

    if ("type" in item && item.type === "discover-intro") {
      return (
        <View className="pb-4" style={{ alignSelf: "center", width: contentWidth }}>
          <UpcomingEventsCard
            events={feed.upcomingQuery.data ?? []}
            isLoading={feed.upcomingQuery.isLoading}
            isError={feed.upcomingQuery.isError}
          />
        </View>
      );
    }

    if ("type" in item && item.type === "reserved-grid") {
      return (
        <View style={{ alignSelf: "center", width: contentWidth }}>
          <ReservedItemsGrid
            items={feed.activeItems}
            columns={columns}
            cardWidth={cardWidth}
            gridGap={gridGap}
            currentUserId={user?.id}
            purchased={feed.tab === "purchased"}
            headerAccessory={null}
            onOpenItem={openItem}
          />
        </View>
      );
    }

    return (
      <View style={{ alignSelf: "center", width: contentWidth }}>
        <DiscoverSection
          section={item}
          cardWidth={cardWidth}
          gridGap={gridGap}
          currentUserId={user?.id}
          avatarUrl={
            item.friend_id ? avatarByKey.get(item.friend_id) : avatarByKey.get(item.username)
          }
          headerAccessory={null}
          onOpenItem={openItem}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ title: t("Discover") }} />
      <StyledFlashList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(row) => ("type" in row ? row.id : row.id)}
        className="flex-1"
        contentContainerClassName="pb-8"
        contentContainerStyle={{ paddingTop: 0 }}
        onScroll={requestMeasure}
        scrollEventThrottle={1}
        ItemSeparatorComponent={RowSeparator}
        onEndReached={feed.loadMore}
        isLoadingMore={feed.activeQuery.isFetchingNextPage}
        getItemType={(row) => ("type" in row ? row.type : "discover-section")}
        ListFooterComponent={
          <View className="gap-4 self-center" style={{ width: contentWidth }}>
            {feed.activeQuery.isLoading ? (
              <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-8">
                <ActivityIndicator colorClassName="accent-brand" />
              </View>
            ) : null}
            {feed.activeQuery.isError ? (
              <InlineState message={t("Failed to load discover feed.")} />
            ) : null}
            {!feed.activeQuery.isLoading &&
            !feed.activeQuery.isError &&
            ((feed.sectionTab && feed.activeSections.length === 0) ||
              (!feed.sectionTab && feed.activeItems.length === 0)) ? (
              <InlineState
                mascot={feed.filtersActive ? "magnifying-glass" : "explorer-map"}
                message={
                  feed.filtersActive
                    ? t("No gifts match your filters.")
                    : t("Nothing to show here yet.")
                }
              />
            ) : null}
          </View>
        }
        extraData={{
          tab: feed.tab,
          cardWidth,
          contentWidth,
          filtersOpen,
          gridGap,
          activeItems: feed.activeItems,
          loading: feed.activeQuery.isLoading,
        }}
      />
      <FloatingBackButton />

      {selection ? (
        <DiscoverItemDetailSheet
          item={selection.item}
          reservedByName={selection.reservedByName}
          currentUserId={user?.id}
          reservePending={toggleReservation.isPending}
          boughtPending={toggleBought.isPending}
          onClose={() => setSelection(null)}
          onToggleReserve={handleToggleSelectedReservation}
          onToggleBought={handleToggleSelectedBought}
        />
      ) : null}
    </View>
  );
}

function RowSeparator({ leadingItem }: { leadingItem?: DiscoverRow }) {
  if (leadingItem && "type" in leadingItem) {
    return null;
  }

  return <View className="h-6" />;
}
