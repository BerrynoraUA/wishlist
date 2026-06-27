"use client";

import { useCallback, useMemo } from "react";
import { useDebouncedQueryParam } from "@/hooks/use-debounced-query-param";
import { useQueryParams } from "@/hooks/use-query-params";
import { DEFAULT_SORT, WISHLIST_VISIBILITY_MAP } from "@/lib/filter-constants";
import {
  getMultiParamValues,
  hasActiveFilters,
  mapFilterValues,
  parsePage,
} from "@/lib/filter-helpers";
import { WISHLIST_PAGE_SIZE } from "../constants";

/**
 * URL-backed filter/sort/pagination state for the home wishlist grid.
 * Safe to call in multiple components — everything is derived from
 * `useSearchParams`, so all instances stay in sync.
 */
export function useHomeWishlistFilters() {
  const { searchParams, setPage, setSingleValueParam, setMultiValueParam } =
    useQueryParams("/home");

  const page = parsePage(searchParams);
  const { value: search, setValue: setSearch } = useDebouncedQueryParam({
    key: "search",
  });
  const sort = searchParams.get("sort") ?? DEFAULT_SORT;
  const visibility = useMemo(() => getMultiParamValues(searchParams, "visibility"), [searchParams]);

  const visibilityTypes = useMemo(
    () => mapFilterValues(visibility, WISHLIST_VISIBILITY_MAP),
    [visibility],
  );

  const queryParams = useMemo(
    () => ({
      skip: (page - 1) * WISHLIST_PAGE_SIZE,
      take: WISHLIST_PAGE_SIZE + 1,
      search,
      sort,
      visibilityTypes,
    }),
    [page, search, sort, visibilityTypes],
  );

  const isFiltersActive = hasActiveFilters(search, [visibility], []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
    },
    [setPage, setSearch],
  );

  const handleVisibilityChange = useCallback(
    (values: string[]) => {
      setMultiValueParam("visibility", values);
    },
    [setMultiValueParam],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      setSingleValueParam("sort", value, DEFAULT_SORT);
    },
    [setSingleValueParam],
  );

  return {
    page,
    setPage,
    search,
    visibility,
    sort,
    queryParams,
    isFiltersActive,
    handleSearchChange,
    handleVisibilityChange,
    handleSortChange,
  };
}
