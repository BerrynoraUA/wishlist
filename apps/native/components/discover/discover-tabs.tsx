import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Text } from "@/components/ui/text";
import type { DiscoverTab } from "@/lib/discover";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

type DiscoverTabOption = {
  value: DiscoverTab;
  label: string;
};

export function DiscoverTabs({
  value,
  onChange,
}: {
  value: DiscoverTab;
  onChange: (value: DiscoverTab) => void;
}) {
  const t = useGT();
  const rows = React.useMemo<DiscoverTabOption[][]>(
    () => [
      [
        { value: "wishlists", label: t("Wishlists") },
        { value: "available", label: t("Available") },
      ],
      [
        { value: "reserved", label: t("Reserved") },
        { value: "purchased", label: t("Purchased") },
      ],
    ],
    [t],
  );

  return (
    <View className="gap-2 rounded-[28px] border border-border-subtle bg-card-bg p-2 shadow-sm">
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-2">
          {row.map((option) => {
            const selected = value === option.value;

            return (
              <AnimatedPressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange(option.value)}
                className={cn(
                  "h-11 flex-1 items-center justify-center rounded-full border border-border-subtle bg-bg-subtle px-3",
                  selected && "border-brand bg-brand",
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-bold",
                    selected ? "text-primary-foreground" : "text-text",
                  )}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
