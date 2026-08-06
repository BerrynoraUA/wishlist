import { CurrencyPicker } from "@/components/ui/currency-picker";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useUpdateSettings } from "@/hooks/use-settings";
import { CircleDollarSign } from "lucide-react-native";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export function CurrencySettings({ selectedCurrency }: { selectedCurrency: string }) {
  const t = useGT();
  const updateSettings = useUpdateSettings();

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon as={CircleDollarSign} className="size-4 text-brand" />
        <Text className="text-sm font-semibold text-text">{t("Display Currency")}</Text>
      </View>
      <CurrencyPicker
        value={selectedCurrency}
        onValueChange={(currency) => updateSettings.mutate({ display_currency: currency })}
      />
    </View>
  );
}
