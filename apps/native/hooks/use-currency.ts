import { useExchangeRates, useSettings } from "@/hooks/use-settings";
import { normalizeCurrencyCode } from "@wishlist/backend/lib/currencies";
import { formatMoney, formatPrice } from "@wishlist/backend/lib/prices";
import { useLocale } from "gt-react-native";
import * as React from "react";

/** The currency the user chose to see prices in. */
export function useDisplayCurrency() {
  const { data: settings } = useSettings();
  return normalizeCurrencyCode(settings?.display_currency);
}

/**
 * `formatPrice` shows a stored item price in the user's display currency (converted when a
 * rate exists); `formatAmount` formats a fixed amount, such as a Secret Santa budget, as-is.
 * Both follow the user's "Round prices" setting and the app language.
 */
export function useCurrencyFormatter() {
  const { data: settings } = useSettings();
  const { data: ratesData } = useExchangeRates();
  const locale = useLocale();

  const currency = normalizeCurrencyCode(settings?.display_currency);
  const round = Boolean(settings?.round_prices);
  const rates = ratesData?.rates;

  return React.useMemo(
    () => ({
      formatPrice: (
        price: string | number | null | undefined,
        itemCurrency: string | null | undefined,
      ) => formatPrice(price, itemCurrency, { currency, rates, round, locale }),
      formatAmount: (amount: number, amountCurrency: string | null | undefined) =>
        formatMoney(amount, amountCurrency, { round, locale }),
    }),
    [currency, locale, rates, round],
  );
}
