"use client";

import { useGT } from "gt-next";
import { RotateCcw } from "lucide-react";
import {
  ActiveFilters,
  FilterDropdown,
  FilterSortActions,
  FilterSortBar,
  FilterSortRow,
  NumberRangeFilter,
  SearchFilter,
  SortSelect,
} from "@/components/ui/FilterSortBar";
import { useWishlistItemFilters } from "../../hooks/use-wishlist-item-filters";
import styles from "../../WishlistPage.module.scss";

type Props = {
  wishlistId: string;
};

/**
 * Self-contained filter toolbar for the wishlist items grid. Reads/writes
 * URL query params via `useWishlistItemFilters`, so any sibling that calls
 * the same hook (e.g. the page) stays in sync without prop drilling.
 */
export function WishlistItemFilters({ wishlistId }: Props) {
  const t = useGT();
  const {
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
  } = useWishlistItemFilters(wishlistId);

  return (
    <FilterSortBar className={styles.filterBar}>
      <FilterSortRow className={styles.filterRow}>
        <SearchFilter
          value={itemSearch}
          onChange={handleSearchChange}
          placeholder={t("Search items...", {
            $id: "wishlist.page.searchItems",
          })}
        />
        <FilterDropdown
          className={styles.itemFilterControl}
          label={t("Status", { $id: "wishlist.items.filter.status" })}
          options={statusOptions}
          active={itemStatuses}
          onChange={handleStatusChange}
          multiSelect
        />
        <FilterDropdown
          className={styles.itemFilterControl}
          label={t("Priority", { $id: "wishlist.items.filter.priority" })}
          options={priorityOptions}
          active={itemPriorities}
          onChange={handlePriorityChange}
          multiSelect
        />
        <NumberRangeFilter
          className={styles.itemPriceFilter}
          compact
          label={t("Price", { $id: "wishlist.items.filter.price" })}
          minValue={itemPriceMin}
          maxValue={itemPriceMax}
          onMinChange={handleMinPriceChange}
          onMaxChange={handleMaxPriceChange}
          minPlaceholder={t("From", { $id: "wishlist.items.price.from" })}
          maxPlaceholder={t("To", { $id: "wishlist.items.price.to" })}
        />
        <FilterSortActions className={styles.itemFilterActions}>
          {isFiltersActive && (
            <button
              type="button"
              className={styles.clearFiltersBtn}
              onClick={clearToolbarFilters}
              title={t("Clear filters", { $id: "filter.clearFilters" })}
            >
              <RotateCcw size={14} />
            </button>
          )}
          <SortSelect options={sortOptions} value={itemSort} onChange={handleSortChange} />
        </FilterSortActions>
      </FilterSortRow>
      <ActiveFilters
        items={activeFilterItems}
        onRemove={handleRemoveActiveFilter}
        onClearAll={clearActiveFilters}
        clearLabel={t("Clear all", { $id: "filter.clearAll" })}
      />
    </FilterSortBar>
  );
}
