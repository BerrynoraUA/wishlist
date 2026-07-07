import {
  useFriendsUpcomingWishlists,
  useInfiniteFriendsWishlistsDiscover,
  useInfiniteFriendsWishlistsDiscoverAll,
  useInfiniteFriendsWishlistsPurchasedByMe,
  useInfiniteFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";
import { useInfiniteListData } from "@/hooks/use-infinite-page";
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
      search: normalizeSearchQuery(debouncedSearch) || undefined,
      sort,
      priorities: priorityIds,
      priceMin: parseOptionalNumber(priceMin),
      priceMax: parseOptionalNumber(priceMax),
      displayCurrency: "USD",
    }),
    [debouncedSearch, priceMax, priceMin, priorityIds, sort],
  );

  const allQuery = useInfiniteFriendsWishlistsDiscoverAll(
    params,
    DISCOVER_PAGE_SIZE,
    tab === "wishlists",
  );
  const availableQuery = useInfiniteFriendsWishlistsDiscover(
    params,
    DISCOVER_PAGE_SIZE,
    tab === "available",
  );
  const reservedQuery = useInfiniteFriendsWishlistsReservedByMe(
    params,
    DISCOVER_PAGE_SIZE,
    tab === "reserved",
  );
  const purchasedQuery = useInfiniteFriendsWishlistsPurchasedByMe(
    params,
    DISCOVER_PAGE_SIZE,
    tab === "purchased",
  );
  const upcomingQuery = useFriendsUpcomingWishlists();

  const sectionTab = isDiscoverSectionTab(tab);
  const { items: allSections, loadMore: loadMoreAll } = useInfiniteListData(allQuery);
  const { items: availableSections, loadMore: loadMoreAvailable } =
    useInfiniteListData(availableQuery);
  const { items: reservedItems, loadMore: loadMoreReserved } = useInfiniteListData(reservedQuery);
  const { items: purchasedItems, loadMore: loadMorePurchased } =
    useInfiniteListData(purchasedQuery);
  const activeSections = tab === "available" ? availableSections : allSections;
  const activeItems = tab === "purchased" ? purchasedItems : reservedItems;
  const activeQuery =
    tab === "available"
      ? availableQuery
      : tab === "reserved"
        ? reservedQuery
        : tab === "purchased"
          ? purchasedQuery
          : allQuery;
  const loadMore =
    tab === "available"
      ? loadMoreAvailable
      : tab === "reserved"
        ? loadMoreReserved
        : tab === "purchased"
          ? loadMorePurchased
          : loadMoreAll;
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
    loadMore,
    setTab,
    setSearch,
    setPriceMin,
    setPriceMax,
    setSort,
    togglePriority,
    resetFilters,
  };
}
