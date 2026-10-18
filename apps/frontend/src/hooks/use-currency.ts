import { useCallback } from "react";
import { useLocale } from "gt-next";
import { useSettings, useExchangeRates } from "@/hooks/use-settings";
import { normalizeCurrencyCode } from "@/lib/currencies";
import { formatPrice as formatItemPrice } from "@/lib/prices";

export function useCurrencyFormatter() {
  const { data: settings } = useSettings();
  const { data: ratesData } = useExchangeRates();
  const locale = useLocale();

  const displayCurrency = normalizeCurrencyCode(settings?.display_currency);
  const rates = ratesData?.rates;

  const formatPrice = useCallback(
    (price: string | number | null | undefined, itemCurrency: string | null | undefined) =>
      formatItemPrice(price, itemCurrency, { currency: displayCurrency, rates, locale }),
    [displayCurrency, rates, locale],
  );

  return { formatPrice, displayCurrency };
}
