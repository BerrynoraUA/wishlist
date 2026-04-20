"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./ActiveFilters.module.scss";

type ActiveFilterItem = {
  key: string;
  label: ReactNode;
  groupLabel?: string;
};

type Props = {
  items: ActiveFilterItem[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  clearLabel?: ReactNode;
  className?: string;
};

export function ActiveFilters({
  items,
  onRemove,
  onClearAll,
  clearLabel = "Clear all",
  className,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <div className={styles.list}>
        {items.map((item) => (
          <span key={item.key} className={styles.tag}>
            {item.groupLabel && (
              <span className={styles.groupLabel}>{item.groupLabel}:</span>
            )}
            <span>{item.label}</span>
            <button
              type="button"
              className={styles.remove}
              onClick={() => onRemove(item.key)}
              aria-label="Remove filter"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      {items.length > 1 && (
        <button type="button" className={styles.clearAll} onClick={onClearAll}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}
