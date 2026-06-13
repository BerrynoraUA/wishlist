"use client";

import { Suspense } from "react";
import { useGT } from "gt-next";
import { DiscoverHeader } from "./components/discover-header/DiscoverHeader";
import { UpcomingEvents } from "./components/upcoming-events/UpcomingEvents";
import { DiscoverFilters } from "./components/discover-filters/DiscoverFilters";
import { DiscoverFilterBar } from "./components/discover-filter-bar/DiscoverFilterBar";
import { DiscoverSectionList } from "./components/discover-section-list/DiscoverSectionList";
import { DiscoverEmptyState } from "./components/discover-empty-state/DiscoverEmptyState";
import { ReservedItemsGrid } from "./components/reserved-items-grid/ReservedItemsGrid";
import { useDiscoverPage } from "./hooks/use-discover-page";
import {
  DiscoverSectionSkeleton,
  ReservedGridSkeleton,
} from "./components/discover-skeleton/DiscoverSkeleton";
import { DISCOVER_SECTION_SKELETON_COUNT } from "./constants";

function DiscoverPageContent() {
  const t = useGT();
  const {
    filters: { filter, handleFilterChange },
    tabData: { activeWishlistSections, activeReservedItems, isLoading, isFetching, isError },
    toggleReservation,
    toggleBought,
    nicknameToFriendId,
    avatarById,
    isSectionTab,
    hasNoData,
  } = useDiscoverPage();
  const handleToggleReserve = (itemId: string) => {
    toggleReservation.mutate(itemId);
  };
  const handleToggleBought = (itemId: string) => {
    toggleBought.mutate(itemId);
  };

  const renderContent = () => {
    if (isError) {
      return <p>{t("Failed to load wishlists.", { $id: "discover.page.loadError" })}</p>;
    }

    if (isLoading) {
      if (!isSectionTab) return <ReservedGridSkeleton />;
      return Array.from({ length: DISCOVER_SECTION_SKELETON_COUNT }).map((_, i) => (
        <DiscoverSectionSkeleton key={i} />
      ));
    }

    if (hasNoData) return <DiscoverEmptyState filter={filter} />;

    if (isSectionTab) {
      return (
        <DiscoverSectionList
          sections={activeWishlistSections}
          nicknameToFriendId={nicknameToFriendId}
          avatarById={avatarById}
          onToggleReserve={handleToggleReserve}
          onToggleBought={handleToggleBought}
        />
      );
    }

    return (
      <ReservedItemsGrid
        items={activeReservedItems}
        mode={filter as "reserved" | "purchased"}
        showDiscountBadge
        onToggleReserve={handleToggleReserve}
        onToggleBought={handleToggleBought}
      />
    );
  };

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <DiscoverHeader />
      <UpcomingEvents />
      <DiscoverFilters active={filter} onChange={handleFilterChange} />

      {!isLoading && <DiscoverFilterBar />}

      <div
        style={{
          opacity: isFetching && !isLoading ? 0.6 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {renderContent()}
      </div>
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverPageContent />
    </Suspense>
  );
}
