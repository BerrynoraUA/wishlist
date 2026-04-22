"use client";

import { Suspense, useMemo } from "react";
import { useGT } from "gt-next";
import { DiscoverHeader } from "./components/DiscoverHeader";
import { UpcomingEvents } from "./components/UpcomingEvents";
import { DiscoverFilters } from "./components/DiscoverFilters";
import { DiscoverSection } from "./components/DiscoverSection";
import { ReservedItemsGrid } from "./components/ReservedItemsGrid";
import { useDiscoverTabData } from "./hooks/use-discover-tab-data";
import { useDiscoverFilters } from "./hooks/use-discover-filters";
import {
  useToggleItemBought,
  useToggleItemReservation,
} from "@/hooks/use-items";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useFriends } from "@/hooks/use-friends";
import {
  FilterSortBar,
  FilterSortRow,
  FilterSortActions,
  SearchFilter,
  FilterDropdown,
  NumberRangeFilter,
  SortSelect,
} from "@/components/ui/FilterSortBar";

function DiscoverPageContent() {
  const t = useGT();
  const {
    filter,
    discoverSearch,
    priorityFilter,
    discoverSort,
    priceMin,
    priceMax,
    serverParams,
    priorityOptions,
    sortOptions,
    handleFilterChange,
    handleSearchChange,
    setPriorityFilter,
    setDiscoverSort,
    setPriceMin,
    setPriceMax,
  } = useDiscoverFilters();

  const {
    activeWishlistSections,
    activeReservedItems,
    isLoading,
    isFetching,
    isError,
  } = useDiscoverTabData(serverParams, filter);

  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();

  const { data: friendsList = [] } = useFriends();
  const nicknameToFriendId = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of friendsList) {
      if (f.nickname) map.set(f.nickname, f.friend_id);
    }
    return map;
  }, [friendsList]);

  const friendIds = useMemo(() => {
    return Array.from(
      new Set(
        (activeWishlistSections ?? [])
          .map((s) => s.friend_id ?? nicknameToFriendId.get(s.username))
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }, [activeWishlistSections, nicknameToFriendId]);

  const { data: sectionProfiles = [] } = useProfilesByIds(friendIds);

  const avatarById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of sectionProfiles) {
      map.set(p.id, p.avatar_url ?? null);
    }
    return map;
  }, [sectionProfiles]);

  const hasNoData =
    !isLoading &&
    !isError &&
    (filter === "wishlists" || filter === "available"
      ? activeWishlistSections.length === 0
      : activeReservedItems.length === 0);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <DiscoverHeader />
      <UpcomingEvents />
      <DiscoverFilters active={filter} onChange={handleFilterChange} />

      <FilterSortBar>
        <FilterSortRow>
          <SearchFilter
            value={discoverSearch}
            onChange={handleSearchChange}
            placeholder={t("Search...", { $id: "discover.filter.search" })}
          />
          <FilterDropdown
            label={t("Priority", { $id: "discover.filter.priority" })}
            options={priorityOptions}
            active={priorityFilter}
            onChange={setPriorityFilter}
            multiSelect
          />
          <NumberRangeFilter
            label={t("Price", { $id: "discover.filter.price" })}
            minValue={priceMin}
            maxValue={priceMax}
            onMinChange={setPriceMin}
            onMaxChange={setPriceMax}
            minPlaceholder={t("From", { $id: "discover.filter.price.from" })}
            maxPlaceholder={t("To", { $id: "discover.filter.price.to" })}
          />
          <FilterSortActions>
            <SortSelect
              options={sortOptions}
              value={discoverSort}
              onChange={setDiscoverSort}
            />
          </FilterSortActions>
        </FilterSortRow>
      </FilterSortBar>

      {isError && (
        <p>
          {t("Failed to load wishlists.", {
            $id: "discover.page.loadError",
          })}
        </p>
      )}

      {hasNoData && (
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: 32 }}>
          {filter === "reserved"
            ? t("No reserved items yet.", {
                $id: "discover.page.emptyReserved",
              })
            : filter === "purchased"
              ? t("No purchased items yet.", {
                  $id: "discover.page.emptyPurchased",
                })
              : filter === "available"
                ? t("No available wishlists to discover.", {
                    $id: "discover.page.emptyAvailable",
                  })
                : t("No wishlists to discover.", {
                    $id: "discover.page.emptyWishlists",
                  })}
        </p>
      )}

      <div
        style={{
          opacity: isFetching && !isLoading ? 0.6 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {!isLoading &&
          !isError &&
          (filter === "wishlists" || filter === "available") &&
          activeWishlistSections.map((section) => (
            <DiscoverSection
              key={section.id}
              {...section}
              friend_id={
                section.friend_id ?? nicknameToFriendId.get(section.username)
              }
              showDiscountBadge={true}
              avatarUrl={
                section.avatar_url ??
                ((section.friend_id ?? nicknameToFriendId.get(section.username))
                  ? (avatarById.get(
                      section.friend_id ??
                        nicknameToFriendId.get(section.username) ??
                        "",
                    ) ?? null)
                  : null)
              }
              onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
              onToggleBought={(itemId) => toggleBought.mutate(itemId)}
            />
          ))}

        {!isLoading && !isError && filter === "reserved" && (
          <ReservedItemsGrid
            items={activeReservedItems}
            mode="reserved"
            showDiscountBadge={true}
            onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
            onToggleBought={(itemId) => toggleBought.mutate(itemId)}
          />
        )}

        {!isLoading && !isError && filter === "purchased" && (
          <ReservedItemsGrid
            items={activeReservedItems}
            mode="purchased"
            showDiscountBadge={true}
            onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
            onToggleBought={(itemId) => toggleBought.mutate(itemId)}
          />
        )}
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
