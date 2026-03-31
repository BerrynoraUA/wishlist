import { useCallback } from "react";
import { useSettings, useExchangeRates } from "@/hooks/use-settings";
import { formatConvertedPrice, formatItemPrice } from "@/lib/helpers/price-helper";

export function useCurrencyFormatter() {
  const { data: settings } = useSettings();
  const { data: ratesData } = useExchangeRates();

  const displayCurrency = settings?.display_currency ?? "USD";
  const rates = ratesData?.rates;

  const formatPrice = useCallback(
    (
      price: string | number | null | undefined,
      itemCurrency: string | null | undefined,
    ): string => {
      if (!rates) {
        return formatItemPrice(price, itemCurrency);
      }

      return formatConvertedPrice(price, itemCurrency, displayCurrency, rates);
    },
    [displayCurrency, rates],
  );

  return { formatPrice, displayCurrency };
}
