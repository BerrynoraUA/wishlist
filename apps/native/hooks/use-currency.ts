import { useExchangeRates, useSettings } from "@/hooks/use-settings";
import { formatConvertedPrice } from "@/lib/prices";
import { normalizeCurrencyCode } from "@wishlist/backend/lib/currencies";
import * as React from "react";

/** Formats prices in the user's chosen display currency, converting with the cached rates. */
export function useCurrencyFormatter() {
  const { data: settings } = useSettings();
  const { data: ratesData } = useExchangeRates();

  const displayCurrency = normalizeCurrencyCode(settings?.display_currency);
  const rates = ratesData?.rates;

  const formatPrice = React.useCallback(
    (price: string | number | null | undefined, itemCurrency: string | null | undefined) =>
      formatConvertedPrice(price, itemCurrency, displayCurrency, rates),
    [displayCurrency, rates],
  );

  return { formatPrice, displayCurrency };
}
