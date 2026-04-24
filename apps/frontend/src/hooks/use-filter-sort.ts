"use client";

import { useCallback, useMemo, useState } from "react";

type FilterState = Record<string, string[]>;

type UseFilterSortOptions = {
  defaultSort?: string;
  defaultFilters?: FilterState;
};

export function useFilterSort({
  defaultSort = "",
  defaultFilters = {},
}: UseFilterSortOptions = {}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setFilter = useCallback((key: string, values: string[]) => {
    setFilters((prev) => {
      if (values.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: values };
    });
  }, []);

  const removeFilter = useCallback((compositeKey: string) => {
    const [groupKey, value] = compositeKey.split("::");
    setFilters((prev) => {
      const current = prev[groupKey];
      if (!current) return prev;
      const next = current.filter((v) => v !== value);
      if (next.length === 0) {
        const { [groupKey]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [groupKey]: next };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearAll = useCallback(() => {
    setSearch("");
    setSort(defaultSort);
    setFilters({});
  }, [defaultSort]);

  const activeFilterList = useMemo(() => {
    return Object.entries(filters).flatMap(([groupKey, values]) =>
      values.map((value) => ({
        key: `${groupKey}::${value}`,
        groupKey,
        value,
      })),
    );
  }, [filters]);

  const hasActiveFilters = search !== "" || activeFilterList.length > 0 || sort !== defaultSort;

  return {
    search,
    setSearch,
    sort,
    setSort,
    filters,
    setFilter,
    removeFilter,
    clearAllFilters,
    clearAll,
    activeFilterList,
    hasActiveFilters,
  };
}
