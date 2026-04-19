"use client";

import styles from "./NumberRangeFilter.module.scss";

type Props = {
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  label?: string;
  className?: string;
};

export function NumberRangeFilter({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder = "From",
  maxPlaceholder = "To",
  label,
  className,
}: Props) {
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.range}>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          className={styles.input}
          value={minValue}
          onChange={(event) => onMinChange(event.target.value)}
          placeholder={minPlaceholder}
          aria-label={minPlaceholder}
        />
        <span className={styles.separator}>-</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          className={styles.input}
          value={maxValue}
          onChange={(event) => onMaxChange(event.target.value)}
          placeholder={maxPlaceholder}
          aria-label={maxPlaceholder}
        />
      </div>
    </div>
  );
}
