import {
  settingsDropdownContentClassName,
  settingsDropdownOptionClassName,
  settingsDropdownTriggerClassName,
} from "@/components/settings/settings-dropdown-styles";
import { SettingsSection } from "@/components/settings/settings-section";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useUpdateSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@wishlist/backend/lib/currencies";
import { Check, ChevronDown, CircleDollarSign } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";

export function CurrencySettings({ selectedCurrency }: { selectedCurrency: string }) {
  const t = useGT();
  const updateSettings = useUpdateSettings();
  const [expanded, setExpanded] = React.useState(false);
  const [currencyCode, setCurrencyCode] = React.useState(selectedCurrency);
  const selectedOption = currencyForCode(currencyCode);

  React.useEffect(() => {
    if (!updateSettings.isPending) setCurrencyCode(selectedCurrency);
  }, [selectedCurrency, updateSettings.isPending]);

  function selectCurrency(currency: SupportedCurrency) {
    if (currency.code === currencyCode || updateSettings.isPending) {
      setExpanded(false);
      return;
    }

    const previousCurrency = currencyCode;
    setCurrencyCode(currency.code);
    setExpanded(false);
    updateSettings.mutate(
      { display_currency: currency.code },
      {
        onError: () => setCurrencyCode(previousCurrency),
      },
    );
  }

  return (
    <SettingsSection title={t("Display Currency")} icon={CircleDollarSign}>
      <View className="gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={t("Select display currency")}
          onPress={() => setExpanded((current) => !current)}
          className={cn(
            settingsDropdownTriggerClassName,
            "flex-row items-center justify-between gap-3 active:bg-bg-subtle",
          )}
        >
          <Text className="min-w-0 flex-1 font-semibold text-text" numberOfLines={1}>
            {formatCurrency(selectedOption)}
          </Text>
          <Icon
            as={ChevronDown}
            className={cn("size-4 shrink-0 text-text-muted", expanded && "rotate-180")}
          />
        </Pressable>

        {expanded ? (
          <View className={settingsDropdownContentClassName}>
            <ScrollView
              className="max-h-72"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {SUPPORTED_CURRENCIES.map((currency) => {
                const selected = currency.code === currencyCode;

                return (
                  <Pressable
                    key={currency.code}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => selectCurrency(currency)}
                    className={cn(
                      settingsDropdownOptionClassName,
                      "flex-row items-center gap-3",
                      selected && "bg-bg-subtle",
                    )}
                  >
                    <View className="size-5 items-center justify-center">
                      {selected ? <Icon as={Check} className="size-4 text-text" /> : null}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-text">{currency.code}</Text>
                      <Text className="text-xs text-text-muted" numberOfLines={1}>
                        {currency.label}
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold text-text-muted">{currency.symbol}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </SettingsSection>
  );
}

function currencyForCode(code: string): SupportedCurrency {
  return (
    SUPPORTED_CURRENCIES.find((item) => item.code === code.trim().toUpperCase()) ??
    SUPPORTED_CURRENCIES[0]
  );
}

function formatCurrency(currency: SupportedCurrency) {
  return `${currency.code} - ${currency.label} (${currency.symbol})`;
}
