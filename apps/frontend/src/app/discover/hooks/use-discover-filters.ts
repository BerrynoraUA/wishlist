"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import { useCurrencyFormatter } from "@/hooks/use-currency";
import {
  ITEM_PRIORITY_OPTIONS,
  DISCOVER_SORT_OPTIONS,
} from "@/lib/filter-constants";
import type { DiscoverTab } from "./use-discover-tab-data";

export function useDiscoverFilters() {
  const t = useGT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { displayCurrency } = useCurrencyFormatter();

  const tabParam = searchParams.get("tab");
  const filter: DiscoverTab =
    tabParam === "available" ||
    tabParam === "reserved" ||
    tabParam === "purchased"
      ? tabParam
      : "wishlists";

  const discoverSearch = useMemo(
    () => searchParams.get("discoverSearch") ?? "",
    [searchParams],
  );
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [discoverSort, setDiscoverSort] = useState("default");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

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
    (nextFilter: DiscoverTab) => {
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
    handleSearchChange,
    setPriorityFilter,
    setDiscoverSort,
    setPriceMin,
    setPriceMax,
  };
}
