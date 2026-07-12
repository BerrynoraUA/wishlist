import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useUpdateSettings } from "@/hooks/use-settings";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@wishlist/backend/lib/currencies";
import { CircleDollarSign } from "lucide-react-native";
import * as React from "react";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export function CurrencySettings({ selectedCurrency }: { selectedCurrency: string }) {
  const t = useGT();
  const updateSettings = useUpdateSettings();
  const currencyOptions = React.useMemo(() => SUPPORTED_CURRENCIES.map(currencyToOption), []);
  const selectedOption = React.useMemo(
    () => currencyToOption(currencyForCode(selectedCurrency)),
    [selectedCurrency],
  );

  function handleCurrencyChange(option: AutocompleteDropdownOption) {
    updateSettings.mutate({ display_currency: option.value });
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon as={CircleDollarSign} className="size-4 text-brand" />
        <Text className="text-sm font-semibold text-text">{t("Display Currency")}</Text>
      </View>
      <AutocompleteDropdown
        value={selectedOption}
        onValueChange={handleCurrencyChange}
        options={currencyOptions}
        placeholder={t("Search currency")}
        emptyText={t("No currencies found")}
        inputProps={{ autoCapitalize: "characters" }}
      />
    </View>
  );
}

function currencyForCode(code: string): SupportedCurrency {
  const currency = findCurrencyByCode(code) ?? SUPPORTED_CURRENCIES[0];

  return currency;
}

function findCurrencyByCode(code: string) {
  return SUPPORTED_CURRENCIES.find((item) => item.code === code.trim().toUpperCase());
}

function currencyToOption(currency: SupportedCurrency): AutocompleteDropdownOption {
  return {
    value: currency.code,
    label: currency.code,
    displayValue: `${currency.code} - ${currency.label} (${currency.symbol})`,
    description: currency.label,
    trailing: currency.symbol,
  };
}
