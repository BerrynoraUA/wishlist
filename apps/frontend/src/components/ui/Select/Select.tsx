"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "./Select.module.scss";

type Option<Value extends string = string> = {
  value: Value;
  label: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode | ((active: boolean) => ReactNode);
  disabled?: boolean;
  searchText?: string;
};

type Props<Value extends string> = {
  value: Value;
  onChange: (value: Value) => void;
  options: Option<Value>[];
  ariaLabel?: string;
  placeholder?: ReactNode;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  leadingClassName?: string;
  size?: "md" | "sm";
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsText?: ReactNode;
};

export function Select<Value extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder,
  disabled = false,
  className,
  triggerClassName,
  dropdownClassName,
  optionClassName,
  leadingClassName,
  size = "md",
  searchable = false,
  searchPlaceholder,
  noResultsText = "No results",
}: Props<Value>) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!searchable || query.length === 0) return options;

    return options.filter((option) => {
      const parts = [
        option.value,
        option.searchText,
        typeof option.label === "string" ? option.label : undefined,
        typeof option.description === "string" ? option.description : undefined,
        typeof option.leading === "string" ? option.leading : undefined,
      ];

      return parts.some((part) => part?.toLowerCase().includes(query));
    });
  }, [options, searchTerm, searchable]);

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

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      return;
    }

    if (searchable) {
      searchInputRef.current?.focus();
    }
  }, [open, searchable]);

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`.trim()} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.trigger} ${styles[size]} ${triggerClassName ?? ""}`.trim()}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={styles.triggerValue}>
          {selected?.leading != null && (
            <span className={`${styles.leading} ${leadingClassName ?? ""}`.trim()}>
              {selected.leading}
            </span>
          )}
          <span className={styles.copy}>
            <span className={styles.label}>{selected?.label ?? placeholder}</span>
            {selected?.description != null && (
              <span className={styles.description}>{selected.description}</span>
            )}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`.trim()}
        />
      </button>

      {open && (
        <div className={`${styles.dropdown} ${dropdownClassName ?? ""}`.trim()}>
          {searchable && (
            <div className={styles.searchWrap}>
              <input
                ref={searchInputRef}
                className={styles.searchInput}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                type="search"
              />
            </div>
          )}
          <div role="listbox">
            {filteredOptions.map((option) => {
              const isActive = option.value === value;
              const trailing =
                typeof option.trailing === "function" ? option.trailing(isActive) : option.trailing;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={option.disabled}
                  className={`${styles.option} ${isActive ? styles.active : ""} ${optionClassName ?? ""}`.trim()}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className={styles.optionMain}>
                    {option.leading != null && (
                      <span className={`${styles.leading} ${leadingClassName ?? ""}`.trim()}>
                        {option.leading}
                      </span>
                    )}
                    <span className={styles.copy}>
                      <span className={styles.label}>{option.label}</span>
                      {option.description != null && (
                        <span className={styles.description}>{option.description}</span>
                      )}
                    </span>
                  </span>
                  {trailing ?? (isActive && <Check size={14} className={styles.check} />)}
                </button>
              );
            })}
            {filteredOptions.length === 0 && <div className={styles.empty}>{noResultsText}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
