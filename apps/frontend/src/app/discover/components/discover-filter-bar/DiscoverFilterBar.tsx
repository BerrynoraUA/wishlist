"use client";

import { useGT } from "gt-next";
import {
  FilterSortBar,
  FilterSortRow,
  FilterSortActions,
  SearchFilter,
  FilterDropdown,
  NumberRangeFilter,
  SortSelect,
} from "@/components/ui/FilterSortBar";
import { useDiscoverFilters } from "../../hooks/use-discover-filters";

/**
 * Self-contained search / priority / price / sort toolbar for Discover.
 * Reads/writes URL query params via `useDiscoverFilters`, so any sibling
 * that calls the same hook stays in sync without prop drilling.
 */
export function DiscoverFilterBar() {
  const t = useGT();
  const {
    discoverSearch,
    priorityFilter,
    discoverSort,
    priceMin,
    priceMax,
    priorityOptions,
    sortOptions,
    handleSearchChange,
    handlePrioritiesChange,
    handleSortChange,
    handlePriceMinChange,
    handlePriceMaxChange,
  } = useDiscoverFilters();

  return (
    <FilterSortBar>
      <FilterSortRow>
        <SearchFilter
          value={discoverSearch}
          onChange={handleSearchChange}
          placeholder={t("Search...", { $id: "discover.filter.search" })}
        />
        <FilterDropdown
          label={t("Priority", { $id: "discover.filter.priority" })}
          options={priorityOptions}
          active={priorityFilter}
          onChange={handlePrioritiesChange}
          multiSelect
        />
        <NumberRangeFilter
          label={t("Price", { $id: "discover.filter.price" })}
          minValue={priceMin}
          maxValue={priceMax}
          onMinChange={handlePriceMinChange}
          onMaxChange={handlePriceMaxChange}
          minPlaceholder={t("From", { $id: "discover.filter.price.from" })}
          maxPlaceholder={t("To", { $id: "discover.filter.price.to" })}
        />
        <FilterSortActions>
          <SortSelect options={sortOptions} value={discoverSort} onChange={handleSortChange} />
        </FilterSortActions>
      </FilterSortRow>
    </FilterSortBar>
  );
}
