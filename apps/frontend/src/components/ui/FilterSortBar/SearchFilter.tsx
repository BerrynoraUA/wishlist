"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";
import styles from "./SearchFilter.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchFilter({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <Search size={15} className={styles.icon} />
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
