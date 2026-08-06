import {
  AutocompleteDropdown,
  type AutocompleteDropdownOption,
} from "@/components/ui/autocomplete-dropdown";
import { countryForCurrency } from "@/lib/locale-flags";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@wishlist/backend/lib/currencies";
import { useGT } from "gt-react-native";
import * as React from "react";

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map(currencyToOption);

export function CurrencyPicker({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (currency: string) => void;
}) {
  const t = useGT();
  const selectedOption = React.useMemo(() => currencyToOption(currencyForCode(value)), [value]);

  return (
    <AutocompleteDropdown
      value={selectedOption}
      onValueChange={(option) => onValueChange(option.value)}
      options={CURRENCY_OPTIONS}
      placeholder={t("Search currency")}
      emptyText={t("No currencies found")}
      inputProps={{ autoCapitalize: "characters" }}
    />
  );
}

function currencyForCode(code: string): SupportedCurrency {
  return (
    SUPPORTED_CURRENCIES.find((currency) => currency.code === code.trim().toUpperCase()) ??
    SUPPORTED_CURRENCIES[0]
  );
}

function currencyToOption(currency: SupportedCurrency): AutocompleteDropdownOption {
  return {
    value: currency.code,
    label: currency.code,
    displayValue: currency.code,
    description: currency.label,
    trailing: currency.symbol,
    flagCountry: countryForCurrency(currency.code),
  };
}
