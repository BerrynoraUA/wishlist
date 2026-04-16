import type { ReactNode } from "react";
import { SUPPORTED_CURRENCIES, normalizeCurrencyCode } from "@/lib/currencies";

export type FormSelectOption<Value extends string = string> = {
  value: Value;
  label: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
};

type TFn = (message: string, options?: Record<string, unknown>) => string;

export type ItemPriorityOption = "None" | "Low" | "Medium" | "High";

export const priorityToValue: Record<Exclude<ItemPriorityOption, "None">, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

export const valueToPriority: Record<number, ItemPriorityOption> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

const supportedCurrencyCodes = new Set(SUPPORTED_CURRENCIES.map((currency) => currency.code));

export function resolveCurrency(value?: string | null) {
  const normalized = normalizeCurrencyCode(value);
  return supportedCurrencyCodes.has(normalized) ? normalized : "USD";
}

export function translatedCurrencyLabel(t: TFn, code: string): string {
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
      return SUPPORTED_CURRENCIES.find((currency) => currency.code === code)?.label ?? code;
  }
}

export function getDetailedCurrencyOptions(t: TFn): FormSelectOption<string>[] {
  return SUPPORTED_CURRENCIES.map((currency) => ({
    value: currency.code,
    label: currency.code,
    description: translatedCurrencyLabel(t, currency.code),
    leading: currency.symbol,
  }));
}

export function getCompactCurrencyOptions(): FormSelectOption<string>[] {
  return SUPPORTED_CURRENCIES.map((currency) => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.code}`,
  }));
}

export function getPriorityOptions(t: TFn): FormSelectOption<ItemPriorityOption>[] {
  return [
    {
      value: "None",
      label: t("No priority", { $id: "item.modal.priorityNone" }),
    },
    {
      value: "Low",
      label: t("Low", { $id: "item.priority.low" }),
    },
    {
      value: "Medium",
      label: t("Medium", { $id: "item.priority.medium" }),
    },
    {
      value: "High",
      label: t("High", { $id: "item.priority.high" }),
    },
  ];
}
