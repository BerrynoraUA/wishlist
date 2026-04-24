"use client";

import type { ReactNode } from "react";
import styles from "./FilterChips.module.scss";

type ChipOption = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
};

type Props = {
  options: ChipOption[];
  active: string[];
  onChange: (values: string[]) => void;
  multiSelect?: boolean;
  className?: string;
};

export function FilterChips({ options, active, onChange, multiSelect = false, className }: Props) {
  function handleClick(value: string) {
    if (multiSelect) {
      const next = active.includes(value) ? active.filter((v) => v !== value) : [...active, value];
      onChange(next);
    } else {
      onChange(active.includes(value) ? [] : [value]);
    }
  }

  return (
    <div className={`${styles.chips} ${className ?? ""}`}>
      {options.map((option) => {
        const isActive = active.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.chip} ${isActive ? styles.active : ""}`}
            onClick={() => handleClick(option.value)}
          >
            {option.icon && <span className={styles.chipIcon}>{option.icon}</span>}
            <span>{option.label}</span>
            {option.count !== undefined && <span className={styles.chipCount}>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
