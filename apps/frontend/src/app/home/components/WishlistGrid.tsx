"use client";

import { useGT } from "gt-next";
import { useState } from "react";
import { AddCard } from "@/components/ui/AddCard/AddCard";
import { WishlistCard } from "./WishlistCard";
import styles from "./WishlistGrid.module.scss";
import { useMyWishlists } from "@/hooks/use-wishlists";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { Wishlist } from "@/types/wishlist";
import {
  FilterSortBar,
  FilterSortRow,
  FilterSortActions,
  SearchFilter,
  FilterChips,
  SortSelect,
  ActiveFilters,
} from "@/components/ui/FilterSortBar";
import { useFilterSort } from "@/hooks/use-filter-sort";
import { useDebouncedQueryParam } from "@/hooks/use-debounced-query-param";
import {
  WISHLIST_VISIBILITY_OPTIONS,
  WISHLIST_VISIBILITY_MAP,
  WISHLIST_VISIBILITY_LABELS,
  WISHLIST_SORT_OPTIONS,
  DEFAULT_SORT,
} from "@/lib/filter-constants";
import {
  paginationFlags,
  mapFilterValues,
  hasActiveFilters as checkActiveFilters,
} from "@/lib/filter-helpers";

const PAGE_SIZE = 8;

type Props = {
  onCreateWishlist: () => void;
  onEditWishlist: (wishlist: Wishlist) => void;
  onDeleteWishlist: (wishlist: Wishlist) => void;
};

export function WishlistGrid({
  onCreateWishlist,
  onEditWishlist,
  onDeleteWishlist,
}: Props) {
  const t = useGT();
  const [page, setPage] = useState(1);
  const { value: search, setValue: setSearch } = useDebouncedQueryParam({
    key: "search",
  });

  const {
    sort,
    setSort,
    filters,
    setFilter,
    removeFilter,
    clearAllFilters,
    activeFilterList,
  } = useFilterSort({ defaultSort: DEFAULT_SORT });

  const visibilityTypes = mapFilterValues(
    filters.visibility ?? [],
    WISHLIST_VISIBILITY_MAP,
  );

  const { data, isLoading, isError } = useMyWishlists({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    search,
    sort,
    visibilityTypes,
  });

  const wishlists = data ?? [];

  const { showPagination, totalForPagination } = paginationFlags(
    page,
    wishlists.length,
    PAGE_SIZE,
  );
  const isFiltersActive = checkActiveFilters(
    search,
    [activeFilterList.map((f) => f.value)],
    [],
  );

  const activeFilterItems = activeFilterList.map((f) => ({
    key: f.key,
    label: WISHLIST_VISIBILITY_LABELS[f.value] ?? f.value,
    groupLabel:
      f.groupKey === "visibility"
        ? t("Visibility", { $id: "filter.visibility" })
        : f.groupKey,
  }));

  return (
    <div>
      <div className={styles.toolbar}>
        <h2 className={styles.title}>
          {t("Wishlists", { $id: "home.wishlistGrid.title" })}
        </h2>

        <FilterSortBar className={styles.filterBar}>
          <FilterSortRow className={styles.filterRow}>
            <SearchFilter
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("Search wishlists...", {
                $id: "filter.searchWishlists",
              })}
            />
            <FilterChips
              options={WISHLIST_VISIBILITY_OPTIONS}
              active={filters.visibility ?? []}
              onChange={(values) => {
                setFilter("visibility", values);
                setPage(1);
              }}
            />
            <FilterSortActions>
              <SortSelect
                options={WISHLIST_SORT_OPTIONS}
                value={sort}
                onChange={(value) => {
                  setSort(value);
                  setPage(1);
                }}
              />
            </FilterSortActions>
          </FilterSortRow>
          <ActiveFilters
            items={activeFilterItems}
            onRemove={(key) => removeFilter(key)}
            onClearAll={clearAllFilters}
            clearLabel={t("Clear all", { $id: "filter.clearAll" })}
          />
        </FilterSortBar>
      </div>

      <div className={styles.grid}>
        {isLoading && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i}>
                <Skeleton variant="heading" width="70%" />
                <Skeleton
                  variant="text"
                  width="40%"
                  style={{ marginTop: 10 }}
                />
              </SkeletonCard>
            ))}
          </>
        )}
        {isError && (
          <p>
            {t("Failed to load wishlists.", {
              $id: "home.wishlistGrid.error",
            })}
          </p>
        )}
        {!isLoading &&
          !isError &&
          wishlists.length === 0 &&
          isFiltersActive && (
            <p className={styles.noResults}>
              {t("No wishlists match your filters.", {
                $id: "filter.noResults",
              })}
            </p>
          )}
        {wishlists.map((w) => (
          <WishlistCard
            key={w.id}
            wishlist={w}
            onEdit={
              w.is_owner || w.can_edit ? () => onEditWishlist(w) : undefined
            }
            onDelete={w.is_owner ? () => onDeleteWishlist(w) : undefined}
          />
        ))}
        {!isLoading && !isError && wishlists.length > 0 && (
          <AddCard
            onClick={onCreateWishlist}
            label={t("Create wishlist", {
              $id: "home.wishlistGrid.createCardLabel",
            })}
          />
        )}
      </div>

      {showPagination && (
        <Pagination page={page} total={totalForPagination} onChange={setPage} />
      )}
    </div>
  );
}
