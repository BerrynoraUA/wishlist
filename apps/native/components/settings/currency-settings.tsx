import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from "@/components/ui/select";
import { SettingsSection } from "@/components/settings/settings-section";
import { useUpdateSettings } from "@/hooks/use-settings";
import { SUPPORTED_CURRENCIES } from "@wishlist/backend/lib/currencies";
import { CircleDollarSign } from "lucide-react-native";
import * as React from "react";
import { useGT } from "gt-react-native";

export function CurrencySettings({ selectedCurrency }: { selectedCurrency: string }) {
  const t = useGT();
  const updateSettings = useUpdateSettings();
  const selectedOption = React.useMemo(
    () => currencyOptionForCode(selectedCurrency),
    [selectedCurrency],
  );

  function handleCurrencyChange(option: Option) {
    if (!option?.value) return;

    updateSettings.mutate({ display_currency: option.value });
  }

  return (
    <SettingsSection title={t("Display Currency")} icon={CircleDollarSign}>
      <Select value={selectedOption} onValueChange={handleCurrencyChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("Select currency")} />
        </SelectTrigger>
        <SelectContent className="max-h-80 w-full">
          {SUPPORTED_CURRENCIES.map((currency) => (
            <SelectItem
              key={currency.code}
              label={`${currency.code} - ${currency.label} (${currency.symbol})`}
              value={currency.code}
            />
          ))}
        </SelectContent>
      </Select>
    </SettingsSection>
  );
}

function currencyOptionForCode(code: string): Option {
  const currency =
    SUPPORTED_CURRENCIES.find((item) => item.code === code) ?? SUPPORTED_CURRENCIES[0];

  if (!currency) return undefined;

  return {
    value: currency.code,
    label: `${currency.code} - ${currency.label} (${currency.symbol})`,
  };
}
