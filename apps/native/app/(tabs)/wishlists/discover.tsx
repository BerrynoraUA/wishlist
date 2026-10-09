import {
  DiscoverFilterActions,
  DiscoverFiltersPanel,
} from "@/components/discover/discover-filter-bar";
import { DiscoverSection } from "@/components/discover/discover-section";
import { DiscoverTabs } from "@/components/discover/discover-tabs";
import { ReservedItemsGrid } from "@/components/discover/reserved-items-grid";
import { DiscoverItemDetailSheet } from "@/components/discover/sheets/discover-item-detail-sheet";
import { UpcomingEventsCard } from "@/components/discover/upcoming-events-card";
import { InlineState } from "@/components/shared/inline-state";
import { FloatingBackButton } from "@/components/ui/floating-back-button";
import { PinnedListHeader, usePinnedListHeaderPadding } from "@/components/ui/pinned-list-header";
import {
  ITEM_FILTER_PANEL_HEIGHT,
  SlideOutFilterPanel,
  SlideOutSpacer,
  useSlideOutPanel,
} from "@/components/ui/slide-out-filter-panel";
import { StyledFlashList } from "@/components/ui/styled-flash-list";
import { useUserGuideTargetRegistration } from "@/components/user-guide/user-guide-provider";
import { useTabBarContentPadding } from "@/lib/layout";
import { useDiscoverFeed } from "@/hooks/use-discover-feed";
import { useToggleItemBought, useToggleItemReservation } from "@/hooks/use-items";
import {
  optimisticallyToggleItemBought,
  optimisticallyToggleItemReservation,
  updateItemIfSelected,
} from "@/lib/items";
import { useAuth } from "@/providers/auth-provider";
import type {
  DiscoverSection as DiscoverSectionType,
  ReservedItem,
} from "@wishlist/backend/types/discover";
import type { Item } from "@wishlist/backend/types/item";
import { Stack } from "expo-router";
import { useGT } from "gt-react-native";
import * as React from "react";
import { type TextInput, View, useWindowDimensions } from "react-native";
import { resetFilters } from "@/lib/reset-filters";
import { CardGridSkeleton } from "@/components/ui/list-skeletons";

type DiscoverRow =
  | DiscoverSectionType
  | { id: "discover-intro"; type: "discover-intro" }
  | { id: string; type: "reserved-item"; source: ReservedItem };

const DISCOVER_INTRO_ROW = { id: "discover-intro", type: "discover-intro" } as const;

function getRowType(row: DiscoverRow) {
  return "type" in row ? row.type : "discover-section";
}

function getRowKey(row: DiscoverRow) {
  return row.id;
}

type SelectedDiscoverItem = {
  item: Item;
  reservedByName?: string | null;
};

export default function DiscoverScreen() {
  const t = useGT();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const feed = useDiscoverFeed();
  const searchInputRef = React.useRef<TextInput>(null);
  const priceMinInputRef = React.useRef<TextInput>(null);
  const priceMaxInputRef = React.useRef<TextInput>(null);
  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();
  const {
    open: filtersOpen,
    setOpen: setFiltersOpen,
    progress: filtersProgress,
    height: filtersHeight,
  } = useSlideOutPanel(false, ITEM_FILTER_PANEL_HEIGHT);
  const [selection, setSelection] = React.useState<SelectedDiscoverItem | null>(null);
  const { activeTargetId, requestMeasure } = useUserGuideTargetRegistration();
  const { paddingTop, onHeaderLayout } = usePinnedListHeaderPadding();
  const paddingBottom = useTabBarContentPadding();

  const contentWidth = Math.min(width - 32, 900);
  const gridGap = width >= 768 ? 18 : 14;
  // Sections scroll horizontally, so cards are sized to show ~1.5 per screen as a scroll hint.
  const sectionCardWidth = Math.min(300, Math.max(200, contentWidth * 0.62));
  // Reserved / purchased are a single column: one full-width card per row, scrolling down.
  const reservedCardWidth = contentWidth;

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

  const openItem = React.useCallback((item: Item, reservedByName?: string | null) => {
    setSelection({ item, reservedByName });
  }, []);

  const rows = React.useMemo<DiscoverRow[]>(() => {
    const contentRows: DiscoverRow[] = feed.sectionTab
      ? feed.activeSections
      : feed.activeItems.map((source) => ({
          id: source.item_id,
          type: "reserved-item",
          source,
        }));

    return [DISCOVER_INTRO_ROW, ...contentRows];
  }, [feed.activeItems, feed.activeSections, feed.sectionTab]);

  const upcomingEvents = feed.upcomingQuery.data;
  const upcomingLoading = feed.upcomingQuery.isLoading;
  const upcomingError = feed.upcomingQuery.isError;
  const purchased = feed.tab === "purchased";
  const currentUserId = user?.id;
  const listExtraData = React.useMemo(
    () => ({
      contentWidth,
      gridGap,
      sectionCardWidth,
      reservedCardWidth,
      upcomingEvents,
      upcomingLoading,
      upcomingError,
      purchased,
      currentUserId,
    }),
    [
      contentWidth,
      gridGap,
      sectionCardWidth,
      reservedCardWidth,
      upcomingEvents,
      upcomingLoading,
      upcomingError,
      purchased,
      currentUserId,
    ],
  );
  const contentContainerStyle = React.useMemo(
    () => ({ paddingTop, paddingBottom }),
    [paddingTop, paddingBottom],
  );

  const renderRow = React.useCallback(
    ({ item }: { item: DiscoverRow }) => {
      if ("type" in item && item.type === "discover-intro") {
        return (
          <View className="pb-4" style={{ alignSelf: "center", width: contentWidth }}>
            <UpcomingEventsCard
              events={upcomingEvents ?? []}
              isLoading={upcomingLoading}
              isError={upcomingError}
            />
          </View>
        );
      }

      if ("type" in item && item.type === "reserved-item") {
        return (
          <View style={{ alignSelf: "center", width: contentWidth }}>
            <ReservedItemsGrid
              items={[item.source]}
              columns={1}
              cardWidth={reservedCardWidth}
              gridGap={gridGap}
              currentUserId={currentUserId}
              purchased={purchased}
              onOpenItem={openItem}
            />
          </View>
        );
      }

      return (
        <View style={{ alignSelf: "center", width: contentWidth }}>
          <DiscoverSection
            section={item}
            cardWidth={sectionCardWidth}
            gridGap={gridGap}
            currentUserId={currentUserId}
            avatarUrl={item.avatar_url}
            headerAccessory={null}
            onOpenItem={openItem}
          />
        </View>
      );
    },
    [
      contentWidth,
      currentUserId,
      gridGap,
      openItem,
      purchased,
      reservedCardWidth,
      sectionCardWidth,
      upcomingError,
      upcomingEvents,
      upcomingLoading,
    ],
  );

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ title: t("Discover") }} />
      <PinnedListHeader
        contentWidth={contentWidth}
        onLayout={onHeaderLayout}
        panel={
          <SlideOutFilterPanel open={filtersOpen} progress={filtersProgress} height={filtersHeight}>
            <DiscoverFiltersPanel
              searchInputRef={searchInputRef}
              priceMinInputRef={priceMinInputRef}
              priceMaxInputRef={priceMaxInputRef}
              open={filtersOpen}
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
          </SlideOutFilterPanel>
        }
      >
        <View>
          <View className="flex-row items-center gap-3">
            <DiscoverFilterActions
              filtersOpen={filtersOpen}
              filtersActive={feed.filtersActive}
              onFiltersOpenChange={setFiltersOpen}
              onResetFilters={() =>
                resetFilters(feed.resetFilters, [
                  searchInputRef.current,
                  priceMinInputRef.current,
                  priceMaxInputRef.current,
                ])
              }
            />
            <View className="min-w-0 flex-1">
              <DiscoverTabs
                value={feed.tab}
                onChange={(value) => {
                  feed.setTab(value);
                  setSelection(null);
                }}
              />
            </View>
          </View>
        </View>
      </PinnedListHeader>
      <StyledFlashList
        data={rows}
        renderItem={renderRow}
        keyExtractor={getRowKey}
        className="flex-1"
        contentContainerStyle={contentContainerStyle}
        onScroll={activeTargetId && !activeTargetId.startsWith("nav-") ? requestMeasure : undefined}
        scrollEventThrottle={activeTargetId && !activeTargetId.startsWith("nav-") ? 16 : undefined}
        ItemSeparatorComponent={RowSeparator}
        onEndReached={feed.loadMore}
        isLoadingMore={feed.activeQuery.isFetchingNextPage}
        getItemType={getRowType}
        ListHeaderComponent={<SlideOutSpacer progress={filtersProgress} height={filtersHeight} />}
        ListFooterComponent={
          <View className="gap-4 self-center" style={{ width: contentWidth }}>
            {feed.activeQuery.isLoading ? (
              <CardGridSkeleton cardWidth={sectionCardWidth} gridGap={gridGap} />
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
        extraData={listExtraData}
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
  if (leadingItem && "type" in leadingItem && leadingItem.type === "discover-intro") {
    return null;
  }

  return <View className={leadingItem && "type" in leadingItem ? "h-4" : "h-6"} />;
}
