"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";
import styles from "./FilterDropdown.module.scss";

type FilterOption = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
};

type Props = {
  label: ReactNode;
  options: FilterOption[];
  active: string[];
  onChange: (values: string[]) => void;
  multiSelect?: boolean;
  className?: string;
};

export function FilterDropdown({
  label,
  options,
  active,
  onChange,
  multiSelect = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasActive = active.length > 0;

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

  function handleSelect(value: string) {
    if (multiSelect) {
      const next = active.includes(value) ? active.filter((v) => v !== value) : [...active, value];
      onChange(next);
    } else {
      onChange(active.includes(value) ? [] : [value]);
      setOpen(false);
    }
  }

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.trigger} ${hasActive ? styles.triggerActive : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Filter size={14} />
        <span>{label}</span>
        {hasActive && <span className={styles.badge}>{active.length}</span>}
        <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox">
          {options.map((option) => {
            const isActive = active.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
                onClick={() => handleSelect(option.value)}
              >
                <span className={styles.optionContent}>
                  {option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
                  <span>{option.label}</span>
                </span>
                {isActive && <span className={styles.check}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
