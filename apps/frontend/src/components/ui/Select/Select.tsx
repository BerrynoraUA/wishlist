"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "./Select.module.scss";

type Option<Value extends string = string> = {
  value: Value;
  label: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  disabled?: boolean;
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
  size?: "md" | "sm";
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
  size = "md",
}: Props<Value>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

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
          {selected?.leading != null && <span className={styles.leading}>{selected.leading}</span>}
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
        <div className={`${styles.dropdown} ${dropdownClassName ?? ""}`.trim()} role="listbox">
          {options.map((option) => {
            const isActive = option.value === value;

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
                    <span className={styles.leading}>{option.leading}</span>
                  )}
                  <span className={styles.copy}>
                    <span className={styles.label}>{option.label}</span>
                    {option.description != null && (
                      <span className={styles.description}>{option.description}</span>
                    )}
                  </span>
                </span>
                {isActive && <Check size={14} className={styles.check} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
