import {
  useFriendsUpcomingWishlists,
  useFriendsWishlistsDiscover,
  useFriendsWishlistsDiscoverAll,
  useFriendsWishlistsPurchasedByMe,
  useFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";
import { DISCOVER_PAGE_SIZE, type DiscoverTab, isDiscoverSectionTab } from "@/lib/discover";
import { parseOptionalNumber } from "@/lib/items";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type { DiscoverQueryParams } from "@wishlist/backend/types/discover";
import * as React from "react";

export function useDiscoverFeed() {
  const [tab, setTab] = React.useState<DiscoverTab>("wishlists");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [priorityIds, setPriorityIds] = React.useState<string[]>([]);
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [sort, setSort] = React.useState("default");

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const params = React.useMemo<DiscoverQueryParams>(
    () => ({
      skip: 0,
      take: DISCOVER_PAGE_SIZE,
      search: normalizeSearchQuery(debouncedSearch) || undefined,
      sort,
      priorities: priorityIds,
      priceMin: parseOptionalNumber(priceMin),
      priceMax: parseOptionalNumber(priceMax),
      displayCurrency: "USD",
    }),
    [debouncedSearch, priceMax, priceMin, priorityIds, sort],
  );

  const allQuery = useFriendsWishlistsDiscoverAll(params, tab === "wishlists");
  const availableQuery = useFriendsWishlistsDiscover(params, tab === "available");
  const reservedQuery = useFriendsWishlistsReservedByMe(params, tab === "reserved");
  const purchasedQuery = useFriendsWishlistsPurchasedByMe(params, tab === "purchased");
  const upcomingQuery = useFriendsUpcomingWishlists();

  const sectionTab = isDiscoverSectionTab(tab);
  const activeSections = tab === "available" ? (availableQuery.data ?? []) : (allQuery.data ?? []);
  const activeItems =
    tab === "purchased" ? (purchasedQuery.data ?? []) : (reservedQuery.data ?? []);
  const activeQuery =
    tab === "available"
      ? availableQuery
      : tab === "reserved"
        ? reservedQuery
        : tab === "purchased"
          ? purchasedQuery
          : allQuery;
  const filtersActive =
    Boolean(search.trim()) ||
    priorityIds.length > 0 ||
    Boolean(priceMin.trim()) ||
    Boolean(priceMax.trim()) ||
    sort !== "default";

  function togglePriority(priorityId: string) {
    setPriorityIds((current) =>
      current.includes(priorityId)
        ? current.filter((item) => item !== priorityId)
        : [...current, priorityId],
    );
  }

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setPriorityIds([]);
    setPriceMin("");
    setPriceMax("");
    setSort("default");
  }

  return {
    tab,
    search,
    priorityIds,
    priceMin,
    priceMax,
    sort,
    sectionTab,
    activeSections,
    activeItems,
    activeQuery,
    upcomingQuery,
    filtersActive,
    setTab,
    setSearch,
    setPriceMin,
    setPriceMax,
    setSort,
    togglePriority,
    resetFilters,
  };
}
