"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "./CurrencySettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { SUPPORTED_CURRENCIES } from "@/types/settings";

export function CurrencySettings() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const activeCurrency = settings?.display_currency ?? "USD";

  function handleSelect(code: string) {
    updateSettings.mutate({ display_currency: code });
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = SUPPORTED_CURRENCIES.find((c) => c.code === activeCurrency);

  return (
    <SettingsSection
      title="Display Currency"
      description="Prices on items will be converted and shown in your selected currency."
    >
      <div className={styles.selectorWrapper} ref={dropdownRef}>
        <button
          type="button"
          className={styles.selectorButton}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className={styles.selectedLabel}>
            <span className={styles.currencySymbol}>
              {selected?.symbol ?? "$"}
            </span>
            <span>{selected?.code ?? "USD"}</span>
            <span className={styles.currencyName}>
              {selected?.label ?? "US Dollar"}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          />
        </button>

        {open && (
          <div className={styles.dropdown}>
            {SUPPORTED_CURRENCIES.map((c) => {
              const isActive = activeCurrency === c.code;

              return (
                <button
                  key={c.code}
                  type="button"
                  className={`${styles.option} ${isActive ? styles.active : ""}`}
                  onClick={() => handleSelect(c.code)}
                >
                  <span className={styles.optionLeft}>
                    <span className={styles.currencySymbol}>{c.symbol}</span>
                    <span className={styles.optionCode}>{c.code}</span>
                    <span className={styles.optionLabel}>{c.label}</span>
                  </span>
                  {isActive && <Check size={14} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
