"use client";

import { useGT } from "gt-next";
import { Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import styles from "./CurrencySettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { SUPPORTED_CURRENCIES } from "@/types/settings";

type TFn = ReturnType<typeof useGT>;

function translatedCurrencyLabel(t: TFn, code: string): string {
  switch (code) {
    case "USD":
      return t("US Dollar", { $id: "settings.currency.USD" });
    case "EUR":
      return t("Euro", { $id: "settings.currency.EUR" });
    case "GBP":
      return t("British Pound", { $id: "settings.currency.GBP" });
    case "UAH":
      return t("Ukrainian Hryvnia", { $id: "settings.currency.UAH" });
    case "AED":
      return t("UAE Dirham", { $id: "settings.currency.AED" });
    case "AUD":
      return t("Australian Dollar", { $id: "settings.currency.AUD" });
    case "BGN":
      return t("Bulgarian Lev", { $id: "settings.currency.BGN" });
    case "BRL":
      return t("Brazilian Real", { $id: "settings.currency.BRL" });
    case "CAD":
      return t("Canadian Dollar", { $id: "settings.currency.CAD" });
    case "CHF":
      return t("Swiss Franc", { $id: "settings.currency.CHF" });
    case "CNY":
      return t("Chinese Yuan", { $id: "settings.currency.CNY" });
    case "CZK":
      return t("Czech Koruna", { $id: "settings.currency.CZK" });
    case "DKK":
      return t("Danish Krone", { $id: "settings.currency.DKK" });
    case "HKD":
      return t("Hong Kong Dollar", { $id: "settings.currency.HKD" });
    case "HUF":
      return t("Hungarian Forint", { $id: "settings.currency.HUF" });
    case "IDR":
      return t("Indonesian Rupiah", { $id: "settings.currency.IDR" });
    case "ILS":
      return t("Israeli New Shekel", { $id: "settings.currency.ILS" });
    case "INR":
      return t("Indian Rupee", { $id: "settings.currency.INR" });
    case "ISK":
      return t("Icelandic Krona", { $id: "settings.currency.ISK" });
    case "JPY":
      return t("Japanese Yen", { $id: "settings.currency.JPY" });
    case "KRW":
      return t("South Korean Won", { $id: "settings.currency.KRW" });
    case "MXN":
      return t("Mexican Peso", { $id: "settings.currency.MXN" });
    case "MYR":
      return t("Malaysian Ringgit", { $id: "settings.currency.MYR" });
    case "NOK":
      return t("Norwegian Krone", { $id: "settings.currency.NOK" });
    case "NZD":
      return t("New Zealand Dollar", { $id: "settings.currency.NZD" });
    case "PHP":
      return t("Philippine Peso", { $id: "settings.currency.PHP" });
    case "PLN":
      return t("Polish Zloty", { $id: "settings.currency.PLN" });
    case "RON":
      return t("Romanian Leu", { $id: "settings.currency.RON" });
    case "SEK":
      return t("Swedish Krona", { $id: "settings.currency.SEK" });
    case "SGD":
      return t("Singapore Dollar", { $id: "settings.currency.SGD" });
    case "THB":
      return t("Thai Baht", { $id: "settings.currency.THB" });
    case "TRY":
      return t("Turkish Lira", { $id: "settings.currency.TRY" });
    case "ZAR":
      return t("South African Rand", { $id: "settings.currency.ZAR" });
    default:
      return (
        SUPPORTED_CURRENCIES.find((c) => c.code === code)?.label ?? code
      );
  }
}

export function CurrencySettings() {
  const t = useGT();
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
      title={t("Display Currency", {
        $id: "settings.currency.sectionTitle",
      })}
      description={t(
        "Prices on items will be converted and shown in your selected currency.",
        { $id: "settings.currency.sectionDescription" },
      )}
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
              {translatedCurrencyLabel(t, selected?.code ?? "USD")}
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
                    <span className={styles.optionLabel}>
                      {translatedCurrencyLabel(t, c.code)}
                    </span>
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
