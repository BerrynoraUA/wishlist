import type { ReactNode } from "react";

export type FilterChipOption = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
};

export type FilterGroup = {
  key: string;
  label: string;
  options: FilterChipOption[];
  multiSelect?: boolean;
};

export type SortOption = {
  value: string;
  label: string;
};

export type ActiveFilter = {
  groupKey: string;
  groupLabel: string;
  value: string;
  label: ReactNode;
};
