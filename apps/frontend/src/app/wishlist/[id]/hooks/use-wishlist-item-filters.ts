"use client";

import { useCallback, useMemo } from "react";
import { useGT } from "gt-next";
import { useCurrentUserId } from "@/hooks/use-user";
import { useDebouncedQueryParam } from "@/hooks/use-debounced-query-param";
import { useQueryParams } from "@/hooks/use-query-params";
import { useSessionDraftPresence } from "@/hooks/use-session-draft";
import {
  ITEM_STATUS_OPTIONS,
  ITEM_STATUS_MAP,
  ITEM_STATUS_LABELS,
  ITEM_PRIORITY_OPTIONS,
  ITEM_PRIORITY_LABELS,
  ITEM_SORT_OPTIONS,
  DEFAULT_SORT,
} from "@/lib/filter-constants";
import {
  getMultiParamValues,
  parsePage,
  parseOptionalNumber,
  mapFilterValues,
  hasActiveFilters,
} from "@/lib/filter-helpers";
import { WISHLIST_ITEMS_PAGE_SIZE } from "../constants";

export function useWishlistItemFilters(id: string) {
  const t = useGT();
  const { searchParams, updateQueryParams, setPage, setSingleValueParam, setMultiValueParam } =
    useQueryParams(`/wishlist/${id}`);

  const openItemId = searchParams.get("item");
  const page = parsePage(searchParams);
  const { value: itemSearch, setValue: setItemSearch } = useDebouncedQueryParam({
    key: "itemSearch",
  });
  const { value: itemPriceMin, setValue: setItemPriceMin } = useDebouncedQueryParam({
    key: "itemPriceMin",
  });
  const { value: itemPriceMax, setValue: setItemPriceMax } = useDebouncedQueryParam({
    key: "itemPriceMax",
  });
  const itemSort = searchParams.get("itemSort") ?? DEFAULT_SORT;

  const itemStatuses = useMemo(
    () => getMultiParamValues(searchParams, "itemStatus"),
    [searchParams],
  );
  const itemPriorities = useMemo(
    () => getMultiParamValues(searchParams, "itemPriority"),
    [searchParams],
  );

  const { data: currentUserId = "" } = useCurrentUserId();
  const hasCreateItemDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "create-item",
    scopeId: id,
  });
  const hasEditWishlistDraft = useSessionDraftPresence({
    userId: currentUserId,
    kind: "edit-wishlist",
    scopeId: id,
  });

  const normalizedPriceMin = parseOptionalNumber(itemPriceMin);
  const normalizedPriceMax = parseOptionalNumber(itemPriceMax);

  const statusNumbers = useMemo(
    () => mapFilterValues(itemStatuses, ITEM_STATUS_MAP),
    [itemStatuses],
  );
  const itemsQueryParams = useMemo(
    () => ({
      skip: (page - 1) * WISHLIST_ITEMS_PAGE_SIZE,
      take: WISHLIST_ITEMS_PAGE_SIZE + 1,
      search: itemSearch.trim() || undefined,
      sort: itemSort,
      statuses: statusNumbers.length ? statusNumbers : undefined,
      priorities: itemPriorities.length ? itemPriorities : undefined,
      priceMin: normalizedPriceMin,
      priceMax: normalizedPriceMax,
    }),
    [
      itemSearch,
      itemSort,
      normalizedPriceMax,
      normalizedPriceMin,
      page,
      itemPriorities,
      statusNumbers,
    ],
  );

  const isFiltersActive = hasActiveFilters(
    itemSearch,
    [itemStatuses, itemPriorities],
    [normalizedPriceMin, normalizedPriceMax],
  );

  const statusOptions = useMemo(
    () =>
      ITEM_STATUS_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label, {
          $id: `wishlist.items.status.${option.value}`,
        }),
      })),
    [t],
  );

  const priorityOptions = useMemo(
    () =>
      ITEM_PRIORITY_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label, {
          $id: `wishlist.items.priority.${option.value}`,
        }),
      })),
    [t],
  );

  const sortOptions = useMemo(
    () =>
      ITEM_SORT_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label, {
          $id: `wishlist.items.sort.${option.value}`,
        }),
      })),
    [t],
  );

  const activeFilterItems = useMemo(
    () => [
      ...itemStatuses.map((status) => ({
        key: `itemStatus::${status}`,
        label: ITEM_STATUS_LABELS[status] ?? status,
        groupLabel: t("Status", { $id: "wishlist.items.filter.status" }),
      })),
      ...itemPriorities.map((priority) => ({
        key: `itemPriority::${priority}`,
        label: ITEM_PRIORITY_LABELS[priority] ?? priority,
        groupLabel: t("Priority", {
          $id: "wishlist.items.filter.priority",
        }),
      })),
      ...(normalizedPriceMin !== null
        ? [
            {
              key: "itemPriceMin::value",
              label: `${t("From", { $id: "wishlist.items.price.from" })} ${normalizedPriceMin}`,
              groupLabel: t("Price", {
                $id: "wishlist.items.filter.price",
              }),
            },
          ]
        : []),
      ...(normalizedPriceMax !== null
        ? [
            {
              key: "itemPriceMax::value",
              label: `${t("To", { $id: "wishlist.items.price.to" })} ${normalizedPriceMax}`,
              groupLabel: t("Price", {
                $id: "wishlist.items.filter.price",
              }),
            },
          ]
        : []),
    ],
    [itemPriorities, itemStatuses, normalizedPriceMax, normalizedPriceMin, t],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setItemSearch(value);
      setPage(1);
    },
    [setItemSearch, setPage],
  );

  const handleMinPriceChange = useCallback(
    (value: string) => {
      setItemPriceMin(value);
      setPage(1);
    },
    [setItemPriceMin, setPage],
  );

  const handleMaxPriceChange = useCallback(
    (value: string) => {
      setItemPriceMax(value);
      setPage(1);
    },
    [setItemPriceMax, setPage],
  );

  const handleStatusChange = useCallback(
    (values: string[]) => {
      setMultiValueParam("itemStatus", values);
    },
    [setMultiValueParam],
  );

  const handlePriorityChange = useCallback(
    (values: string[]) => {
      setMultiValueParam("itemPriority", values);
    },
    [setMultiValueParam],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      setSingleValueParam("itemSort", value, DEFAULT_SORT);
    },
    [setSingleValueParam],
  );

  const handleRemoveActiveFilter = useCallback(
    (key: string) => {
      const [paramKey, value] = key.split("::");
      if (paramKey === "itemPriceMin") {
        setItemPriceMin("");
        setPage(1);
        return;
      }

      if (paramKey === "itemPriceMax") {
        setItemPriceMax("");
        setPage(1);
        return;
      }

      const queryKey = paramKey === "itemStatus" ? "itemStatus" : "itemPriority";
      const currentValues = getMultiParamValues(searchParams, queryKey);
      setMultiValueParam(
        queryKey,
        currentValues.filter((current) => current !== value),
      );
    },
    [searchParams, setItemPriceMax, setItemPriceMin, setMultiValueParam, setPage],
  );

  const clearToolbarFilters = useCallback(() => {
    setItemSearch("");
    setItemPriceMin("");
    setItemPriceMax("");
    updateQueryParams((nextParams) => {
      nextParams.delete("itemStatus");
      nextParams.delete("itemPriority");
      nextParams.delete("itemPriceMin");
      nextParams.delete("itemPriceMax");
      nextParams.delete("itemSearch");
      nextParams.delete("page");
    });
  }, [setItemPriceMax, setItemPriceMin, setItemSearch, updateQueryParams]);

  const clearActiveFilters = useCallback(() => {
    updateQueryParams((nextParams) => {
      nextParams.delete("itemStatus");
      nextParams.delete("itemPriority");
      nextParams.delete("itemPriceMin");
      nextParams.delete("itemPriceMax");
      nextParams.delete("page");
    });
  }, [updateQueryParams]);

  const handleOpenItemHandled = useCallback(
    (itemId: string) => {
      if (searchParams.get("item") !== itemId) return;
      updateQueryParams((params) => params.delete("item"));
    },
    [searchParams, updateQueryParams],
  );

  return {
    currentUserId,
    openItemId,
    page,
    setPage,
    itemsQueryParams,
    hasCreateItemDraft,
    hasEditWishlistDraft,
    itemSearch,
    itemPriceMin,
    itemPriceMax,
    itemSort,
    itemStatuses,
    itemPriorities,
    isFiltersActive,
    activeFilterItems,
    statusOptions,
    priorityOptions,
    sortOptions,
    handleSearchChange,
    handleMinPriceChange,
    handleMaxPriceChange,
    handleStatusChange,
    handlePriorityChange,
    handleSortChange,
    handleRemoveActiveFilter,
    clearToolbarFilters,
    clearActiveFilters,
    handleOpenItemHandled,
  };
}
