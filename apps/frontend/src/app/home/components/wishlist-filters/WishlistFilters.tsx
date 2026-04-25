"use client";

import { useGT } from "gt-next";
import {
  FilterSortBar,
  FilterSortRow,
  FilterSortActions,
  SearchFilter,
  FilterDropdown,
  SortSelect,
} from "@/components/ui/FilterSortBar";
import {
  WISHLIST_VISIBILITY_OPTIONS,
  WISHLIST_SORT_OPTIONS,
} from "@/lib/filter-constants";
import { useHomeWishlistFilters } from "../../hooks/use-home-wishlist-filters";
import styles from "../wishlist-grid/WishlistGrid.module.scss";

/**
 * Self-contained search / visibility / sort toolbar for the home wishlist
 * grid. Reads/writes URL query params via `useHomeWishlistFilters`, so any
 * sibling that calls the same hook stays in sync without prop drilling.
 */
export function WishlistFilters() {
  const t = useGT();
  const {
    search,
    visibility,
    sort,
    handleSearchChange,
    handleVisibilityChange,
    handleSortChange,
  } = useHomeWishlistFilters();

  return (
    <FilterSortBar className={styles.filterBar}>
      <FilterSortRow className={styles.filterRow}>
        <SearchFilter
          value={search}
          onChange={handleSearchChange}
          placeholder={t("Search wishlists...", {
            $id: "filter.searchWishlists",
          })}
        />
        <FilterDropdown
          label={t("Access", { $id: "filter.access" })}
          options={WISHLIST_VISIBILITY_OPTIONS}
          active={visibility}
          onChange={handleVisibilityChange}
          multiSelect
        />
        <FilterSortActions>
          <SortSelect
            options={WISHLIST_SORT_OPTIONS}
            value={sort}
            onChange={handleSortChange}
          />
        </FilterSortActions>
      </FilterSortRow>
    </FilterSortBar>
  );
}
