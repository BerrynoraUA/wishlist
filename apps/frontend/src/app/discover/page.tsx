"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import { DiscoverHeader } from "./components/DiscoverHeader";
import { UpcomingEvents } from "./components/UpcomingEvents";
import { DiscoverFilters } from "./components/DiscoverFilters";
import { DiscoverSection } from "./components/DiscoverSection";
import { ReservedItemsGrid } from "./components/ReservedItemsGrid";
import {
  useFriendsWishlistsDiscover,
  useFriendsWishlistsDiscoverAll,
  useFriendsWishlistsPurchasedByMe,
  useFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";
import {
  useToggleItemBought,
  useToggleItemReservation,
} from "@/hooks/use-items";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useFriends } from "@/hooks/use-friends";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  FilterSortBar,
  FilterSortRow,
  FilterSortActions,
  SearchFilter,
  FilterDropdown,
  NumberRangeFilter,
  SortSelect,
} from "@/components/ui/FilterSortBar";
import {
  ITEM_PRIORITY_OPTIONS,
  DISCOVER_SORT_OPTIONS,
} from "@/lib/filter-constants";

function DiscoverPageContent() {
  const t = useGT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { displayCurrency } = useCurrencyFormatter();
  const tabParam = searchParams.get("tab");
  const tabFromUrl: "wishlists" | "available" | "reserved" | "purchased" =
    tabParam === "available" ||
    tabParam === "reserved" ||
    tabParam === "purchased"
      ? tabParam
      : "wishlists";
  const filter = tabFromUrl;
  const discoverSearch = useMemo(
    () => searchParams.get("discoverSearch") ?? "",
    [searchParams],
  );
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [discoverSort, setDiscoverSort] = useState("default");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Server-side filter params
  const serverParams = useMemo(
    () => ({
      search: discoverSearch || undefined,
      sort: discoverSort !== "default" ? discoverSort : undefined,
      priorities: priorityFilter.length
        ? priorityFilter.map(Number)
        : undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      displayCurrency,
    }),
    [
      discoverSearch,
      discoverSort,
      priorityFilter,
      priceMin,
      priceMax,
      displayCurrency,
    ],
  );

  const handleFilterChange = useCallback(
    (nextFilter: "wishlists" | "available" | "reserved" | "purchased") => {
      if (nextFilter === filter) return;

      const params = new URLSearchParams(searchParams.toString());
      if (nextFilter === "wishlists") {
        params.delete("tab");
      } else {
        params.set("tab", nextFilter);
      }

      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        {
          scroll: false,
        },
      );
    },
    [filter, pathname, router, searchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("discoverSearch", value);
      } else {
        params.delete("discoverSearch");
      }
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        {
          scroll: false,
        },
      );
    },
    [pathname, router, searchParams],
  );

  const {
    data: allWishlistsSections = [],
    isLoading: isAllWishlistsLoading,
    isFetching: isAllWishlistsFetching,
    isError: isAllWishlistsError,
  } = useFriendsWishlistsDiscoverAll(serverParams, filter === "wishlists");

  const {
    data: wishlistsSections = [],
    isLoading: isWishlistsLoading,
    isFetching: isWishlistsFetching,
    isError: isWishlistsError,
  } = useFriendsWishlistsDiscover(serverParams, filter === "available");

  const {
    data: reservedSections = [],
    isLoading: isReservedLoading,
    isFetching: isReservedFetching,
    isError: isReservedError,
  } = useFriendsWishlistsReservedByMe(serverParams, filter === "reserved");

  const {
    data: purchasedSections = [],
    isLoading: isPurchasedLoading,
    isFetching: isPurchasedFetching,
    isError: isPurchasedError,
  } = useFriendsWishlistsPurchasedByMe(serverParams, filter === "purchased");

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

  const activeWishlistSections =
    filter === "wishlists" ? allWishlistsSections : wishlistsSections;
  const activeReservedItems =
    filter === "reserved" ? reservedSections : purchasedSections;

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

  const isLoading =
    filter === "wishlists"
      ? isAllWishlistsLoading
      : filter === "available"
        ? isWishlistsLoading
        : filter === "reserved"
          ? isReservedLoading
          : isPurchasedLoading;
  const isFetching =
    filter === "wishlists"
      ? isAllWishlistsFetching
      : filter === "available"
        ? isWishlistsFetching
        : filter === "reserved"
          ? isReservedFetching
          : isPurchasedFetching;
  const isError =
    filter === "wishlists"
      ? isAllWishlistsError
      : filter === "available"
        ? isWishlistsError
        : filter === "reserved"
          ? isReservedError
          : isPurchasedError;
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
            options={ITEM_PRIORITY_OPTIONS.map((o) => ({
              ...o,
              label: t(o.label, { $id: `discover.filter.priority.${o.value}` }),
            }))}
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
              options={DISCOVER_SORT_OPTIONS.map((o) => ({
                ...o,
                label: t(o.label, { $id: `discover.sort.${o.value}` }),
              }))}
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
