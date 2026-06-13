import { useMyWishlists } from "@/hooks/use-wishlists";
import {
  DEFAULT_WISHLIST_SORT,
  WISHLIST_PAGE_SIZE,
  WISHLIST_VISIBILITY_MAP,
  hasActiveFilters,
  paginationFlags,
} from "@/lib/wishlists";
import type { WishlistVisibility } from "@wishlist/backend/types/wishlist";
import * as React from "react";

export function useWishlistFeed(width: number) {
  const [page, setPage] = React.useState(1);
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
      skip: (page - 1) * WISHLIST_PAGE_SIZE,
      take: WISHLIST_PAGE_SIZE,
      search: debouncedSearch,
      sort,
      visibilityTypes,
    }),
    [debouncedSearch, page, sort, visibilityTypes],
  );

  const query = useMyWishlists(queryParams);
  const wishlists = query.data ?? [];
  const filtersActive = hasActiveFilters(debouncedSearch, visibility);
  const pagination = paginationFlags(page, wishlists.length, WISHLIST_PAGE_SIZE);
  const contentWidth = Math.min(width - 32, 1200);
  const gridGap = width >= 768 ? 22 : 16;
  const columns = width >= 820 ? 2 : 1;
  const cardWidth = columns === 2 ? (contentWidth - gridGap) / 2 : contentWidth;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleVisibilityChange(value: string) {
    setVisibility((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSort(value);
    setPage(1);
  }

  function handleResetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setVisibility([]);
    setSort(DEFAULT_WISHLIST_SORT);
    setPage(1);
  }

  return {
    page,
    search,
    sort,
    visibility,
    query,
    wishlists,
    filtersActive,
    pagination,
    cardWidth,
    contentWidth,
    columns,
    gridGap,
    setPage,
    handleSearchChange,
    handleSortChange,
    handleVisibilityChange,
    handleResetFilters,
  };
}
