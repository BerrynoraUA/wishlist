import {
  DiscoverFilterBar,
  DiscoverFiltersPanel,
} from "@/components/discover/discover-filter-bar";
import { DiscoverSection } from "@/components/discover/discover-section";
import { DiscoverTabs } from "@/components/discover/discover-tabs";
import { ReservedItemsGrid } from "@/components/discover/reserved-items-grid";
import { DiscoverItemDetailSheet } from "@/components/discover/sheets/discover-item-detail-sheet";
import { UpcomingEventsCard } from "@/components/discover/upcoming-events-card";
import { InlineState } from "@/components/shared/inline-state";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { useDiscoverFeed } from "@/hooks/use-discover-feed";
import { useFriends } from "@/hooks/use-friends";
import { useToggleItemBought, useToggleItemReservation } from "@/hooks/use-items";
import { useAuth } from "@/providers/auth-provider";
import type { DiscoverSection as DiscoverSectionType } from "@wishlist/backend/types/discover";
import type { Item } from "@wishlist/backend/types/item";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DiscoverRow =
  | DiscoverSectionType
  | { id: "discover-intro"; type: "discover-intro" }
  | { id: "discover-header"; type: "discover-header" }
  | { id: "reserved-grid"; type: "reserved-grid" };

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
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);

  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  const columns = width >= 820 ? 3 : 2;
  const cardWidth = (contentWidth - gridGap * (columns - 1)) / columns;
  const friends = friendsQuery.data ?? [];

  const avatarByKey = React.useMemo(() => {
    const map = new Map<string, string | null>();
    for (const friend of friends) {
      map.set(friend.friend_id, friend.avatar_url ?? null);
      if (friend.nickname) map.set(friend.nickname, friend.avatar_url ?? null);
    }
    return map;
  }, [friends]);

  const rows = React.useMemo<DiscoverRow[]>(
    () => {
      const contentRows: DiscoverRow[] = feed.sectionTab
        ? feed.activeSections
        : [{ id: "reserved-grid", type: "reserved-grid" }];

      return [
        { id: "discover-header", type: "discover-header" },
        { id: "discover-intro", type: "discover-intro" },
        ...contentRows,
      ];
    },
    [feed.activeSections, feed.sectionTab, filtersOpen],
  );

  function renderRow({ item, target }: { item: DiscoverRow; target: string }) {
    if ("type" in item && item.type === "discover-header") {
      return (
        <View
          className={target === "StickyHeader" ? "bg-bg pb-4" : "bg-transparent pb-4"}
          style={{ paddingTop: target === "StickyHeader" ? insets.top + 8 : 0 }}
        >
          <View className="gap-4 self-center" style={{ width: contentWidth }}>
            <DiscoverFilterBar
              filtersOpen={filtersOpen}
              filtersActive={feed.filtersActive}
              onFiltersOpenChange={setFiltersOpen}
              onResetFilters={feed.resetFilters}
            />
            {filtersOpen ? (
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
            ) : null}
          </View>
        </View>
      );
    }

    if ("type" in item && item.type === "discover-intro") {
      return (
        <View className="gap-4 pb-4" style={{ alignSelf: "center", width: contentWidth }}>
          <DiscoverTabs
            value={feed.tab}
            onChange={(value) => {
              feed.setTab(value);
              setSelectedItem(null);
            }}
          />
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
            onOpenItem={setSelectedItem}
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
            item.friend_id
              ? avatarByKey.get(item.friend_id)
              : avatarByKey.get(item.username)
          }
          onOpenItem={setSelectedItem}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <StyledFlashList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(row) => ("type" in row ? row.id : row.id)}
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        contentContainerClassName="pb-8"
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
        ItemSeparatorComponent={RowSeparator}
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
        stickyHeaderIndices={[0]}
      />

      {selectedItem ? (
        <DiscoverItemDetailSheet
          item={selectedItem}
          currentUserId={user?.id}
          reservePending={toggleReservation.isPending}
          boughtPending={toggleBought.isPending}
          onClose={() => setSelectedItem(null)}
          onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
          onToggleBought={(itemId) => toggleBought.mutate(itemId)}
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
