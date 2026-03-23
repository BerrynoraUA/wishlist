import { useCallback } from "react";
import { useSettings, useExchangeRates } from "@/hooks/use-settings";
import { formatConvertedPrice, formatItemPrice } from "@/lib/utils";

/**
 * Returns a `formatPrice(price, itemCurrency)` function
 * that converts the value into the user's chosen display currency.
 * Falls back to the original currency when rates are unavailable.
 */
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
