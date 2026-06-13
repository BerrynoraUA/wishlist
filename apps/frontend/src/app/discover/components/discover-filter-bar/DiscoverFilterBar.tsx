"use client";

import { useMemo, type CSSProperties } from "react";
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
import { PRIORITY_ICONS } from "@/lib/priority-icons";
import { ALL_PRIORITIES } from "@/lib/priorities";
import { useDiscoverFilters } from "../../hooks/use-discover-filters";
import styles from "./DiscoverFilterBar.module.scss";

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

  const priorityFilterOptions = useMemo(
    () =>
      priorityOptions.map((option) => {
        const priority = ALL_PRIORITIES.find((entry) => entry.id === option.value);
        const Icon = priority ? PRIORITY_ICONS[priority.id] : null;

        if (!priority) return option;

        return {
          ...option,
          label: <span className={styles.priorityFilterName}>{priority.name}</span>,
          icon: (
            <span
              className={styles.priorityFilterIcon}
              style={{ "--priority-color": priority.color } as CSSProperties}
            >
              {Icon && <Icon size={14} strokeWidth={2.5} />}
            </span>
          ),
        };
      }),
    [priorityOptions],
  );

  return (
    <FilterSortBar>
      <FilterSortRow className={styles.row}>
        <SearchFilter
          value={discoverSearch}
          onChange={handleSearchChange}
          placeholder={t("Search...", { $id: "discover.filter.search" })}
        />
        <FilterDropdown
          className={styles.priorityFilter}
          label={t("Priority", { $id: "discover.filter.priority" })}
          options={priorityFilterOptions}
          active={priorityFilter}
          onChange={handlePrioritiesChange}
          multiSelect
          dropdownClassName={styles.priorityFilterDropdown}
          optionClassName={styles.priorityFilterOption}
          optionIconClassName={styles.priorityFilterOptionIcon}
          checkClassName={styles.priorityFilterCheck}
        />
        <NumberRangeFilter
          className={styles.priceFilter}
          compact
          label={t("Price", { $id: "discover.filter.price" })}
          minValue={priceMin}
          maxValue={priceMax}
          onMinChange={handlePriceMinChange}
          onMaxChange={handlePriceMaxChange}
          minPlaceholder={t("From", { $id: "discover.filter.price.from" })}
          maxPlaceholder={t("To", { $id: "discover.filter.price.to" })}
        />
        <FilterSortActions className={styles.actions}>
          <SortSelect options={sortOptions} value={discoverSort} onChange={handleSortChange} />
        </FilterSortActions>
      </FilterSortRow>
    </FilterSortBar>
  );
}
