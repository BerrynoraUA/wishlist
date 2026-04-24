"use client";

import { useCallback, useMemo } from "react";
import { useGT } from "gt-next";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import { useDebouncedQueryParam } from "@/hooks/use-debounced-query-param";
import { useQueryParams } from "@/hooks/use-query-params";
import { ITEM_PRIORITY_OPTIONS, DISCOVER_SORT_OPTIONS } from "@/lib/filter-constants";
import { getMultiParamValues } from "@/lib/filter-helpers";
import type { DiscoverTab } from "./use-discover-tab-data";

const DEFAULT_SORT = "default";
const DEFAULT_TAB: DiscoverTab = "wishlists";

/**
 * URL-backed filter/sort/tab state for the Discover page.
 * Safe to call from multiple components — everything is derived from
 * `useSearchParams`, so all instances stay in sync.
 */
export function useDiscoverFilters() {
  const t = useGT();
  const { searchParams, setSingleValueParam, setMultiValueParam } = useQueryParams("/discover");
  const { displayCurrency } = useCurrencyFormatter();

  const tabParam = searchParams.get("tab");
  const filter: DiscoverTab =
    tabParam === "available" || tabParam === "reserved" || tabParam === "purchased"
      ? tabParam
      : DEFAULT_TAB;

  const { value: discoverSearch, setValue: setDiscoverSearch } = useDebouncedQueryParam({
    key: "discoverSearch",
  });
  const { value: priceMin, setValue: setPriceMin } = useDebouncedQueryParam({
    key: "discoverPriceMin",
  });
  const { value: priceMax, setValue: setPriceMax } = useDebouncedQueryParam({
    key: "discoverPriceMax",
  });

  const priorityFilter = useMemo(
    () => getMultiParamValues(searchParams, "discoverPriority"),
    [searchParams],
  );
  const discoverSort = searchParams.get("discoverSort") ?? DEFAULT_SORT;

  const serverParams = useMemo(
    () => ({
      search: discoverSearch || undefined,
      sort: discoverSort !== DEFAULT_SORT ? discoverSort : undefined,
      priorities: priorityFilter.length ? priorityFilter.map(Number) : undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      displayCurrency,
    }),
    [discoverSearch, discoverSort, priorityFilter, priceMin, priceMax, displayCurrency],
  );

  const handleFilterChange = useCallback(
    (nextFilter: DiscoverTab) => {
      setSingleValueParam("tab", nextFilter, DEFAULT_TAB);
    },
    [setSingleValueParam],
  );

  const handlePrioritiesChange = useCallback(
    (values: string[]) => {
      setMultiValueParam("discoverPriority", values);
    },
    [setMultiValueParam],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      setSingleValueParam("discoverSort", value, DEFAULT_SORT);
    },
    [setSingleValueParam],
  );

  const priorityOptions = useMemo(
    () =>
      ITEM_PRIORITY_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label, {
          $id: `discover.filter.priority.${option.value}`,
        }),
      })),
    [t],
  );

  const sortOptions = useMemo(
    () =>
      DISCOVER_SORT_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label, { $id: `discover.sort.${option.value}` }),
      })),
    [t],
  );

  return {
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
    handleSearchChange: setDiscoverSearch,
    handlePrioritiesChange,
    handleSortChange,
    handlePriceMinChange: setPriceMin,
    handlePriceMaxChange: setPriceMax,
  };
}
