import { SettingsControlsToggleRow } from "@/components/settings/settings-controls";
import { CurrencyPicker } from "@/components/ui/currency-picker";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { normalizeCurrencyCode } from "@wishlist/backend/lib/currencies";
import { Banknote, CircleDollarSign } from "lucide-react-native";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export function CurrencySettings() {
  const t = useGT();
  const updateSettings = useUpdateSettings();
  const { data: settings } = useSettings();
  const displayCurrency = normalizeCurrencyCode(settings?.display_currency);
  const roundPrices = Boolean(settings?.round_prices);

  return (
    <>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon as={CircleDollarSign} className="size-4 text-brand" />
          <Text className="text-sm font-semibold text-text">{t("Display Currency")}</Text>
        </View>
        <CurrencyPicker
          value={displayCurrency}
          onValueChange={(currency) => updateSettings.mutate({ display_currency: currency })}
        />
      </View>

      <SettingsControlsToggleRow
        icon={Banknote}
        title={t("Round prices")}
        subtitle={roundPrices ? t("Whole amounts, no cents") : t("Exact prices with cents")}
        checked={roundPrices}
        onCheckedChange={(value) => updateSettings.mutate({ round_prices: value })}
      />
    </>
  );
}
