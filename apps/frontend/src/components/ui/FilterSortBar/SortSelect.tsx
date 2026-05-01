"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownAZ, ChevronDown } from "lucide-react";
import styles from "./SortSelect.module.scss";
import type { SortOption } from "./types";

type Props = {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SortSelect({ options, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ArrowDownAZ size={14} />
        <span className={styles.label}>{selected?.label ?? "Sort"}</span>
        <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox">
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isActive && <span className={styles.check}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
