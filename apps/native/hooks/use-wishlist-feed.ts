import { useInfiniteMyWishlists } from "@/hooks/use-wishlists";
import {
  DEFAULT_WISHLIST_SORT,
  WISHLIST_PAGE_SIZE,
  WISHLIST_VISIBILITY_MAP,
  hasActiveFilters,
} from "@/lib/wishlists";
import type { WishlistVisibility } from "@wishlist/backend/types/wishlist";
import * as React from "react";

export function useWishlistFeed(width: number) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [visibility, setVisibility] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState(DEFAULT_WISHLIST_SORT);

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const visibilityTypes = React.useMemo(
    () =>
      visibility
        .map((value) => WISHLIST_VISIBILITY_MAP[value])
        .filter((value): value is WishlistVisibility => value !== undefined),
    [visibility],
  );

  const queryParams = React.useMemo(
    () => ({
      search: debouncedSearch,
      sort,
      visibilityTypes,
    }),
    [debouncedSearch, sort, visibilityTypes],
  );

  const query = useInfiniteMyWishlists(queryParams, WISHLIST_PAGE_SIZE);
  const wishlists = React.useMemo(
    () => query.data?.pages.flatMap((page) => page) ?? [],
    [query.data],
  );
  const filtersActive = hasActiveFilters(debouncedSearch, visibility);
  const contentWidth = Math.min(width - 32, 1200);
  const gridGap = width >= 768 ? 22 : 16;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleVisibilityChange(value: string) {
    setVisibility((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function handleSortChange(value: string) {
    setSort(value);
  }

  function handleResetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setVisibility([]);
    setSort(DEFAULT_WISHLIST_SORT);
  }

  function loadMore() {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }

  return {
    search,
    sort,
    visibility,
    query,
    wishlists,
    filtersActive,
    cardWidth,
    contentWidth,
    columns,
    gridGap,
    loadMore,
    handleSearchChange,
    handleSortChange,
    handleVisibilityChange,
    handleResetFilters,
  };
}
