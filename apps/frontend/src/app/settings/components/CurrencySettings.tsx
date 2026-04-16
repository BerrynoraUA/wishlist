"use client";

import { useGT } from "gt-next";
import styles from "./CurrencySettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Select } from "@/components/ui/Select/Select";
import { getDetailedCurrencyOptions } from "@/lib/helpers/form-select-options";

export function CurrencySettings() {
  const t = useGT();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const activeCurrency = settings?.display_currency ?? "USD";
  const currencyOptions = getDetailedCurrencyOptions(t);

  function handleSelect(code: string) {
    updateSettings.mutate({ display_currency: code });
  }

  return (
    <SettingsSection
      title={t("Display Currency", {
        $id: "settings.currency.sectionTitle",
      })}
      description={t("Prices on items will be converted and shown in your selected currency.", {
        $id: "settings.currency.sectionDescription",
      })}
    >
      <Select
        value={activeCurrency}
        onChange={handleSelect}
        options={currencyOptions}
        ariaLabel={t("Display Currency", {
          $id: "settings.currency.sectionTitle",
        })}
        className={styles.selector}
      />
    </SettingsSection>
  );
}
