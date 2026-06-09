import {
  SlidingOptionSelector,
  type SlidingOption,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import { Text } from "@/components/ui/text";
import type { DiscoverTab } from "@/lib/discover";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

export function DiscoverTabs({
  value,
  onChange,
}: {
  value: DiscoverTab;
  onChange: (value: DiscoverTab) => void;
}) {
  const t = useGT();
  const rows = React.useMemo<SlidingOption<DiscoverTab>[][]>(
    () => [
      [
        createTabOption("wishlists", t("Wishlists"), "discover-tab-wishlists"),
        createTabOption("available", t("Available"), "discover-tab-available"),
      ],
      [
        createTabOption("reserved", t("Reserved"), "discover-tab-reserved"),
        createTabOption("purchased", t("Purchased"), "discover-tab-purchased"),
      ],
    ],
    [t],
  );

  return (
    <View className="rounded-[28px] border border-border-subtle bg-card-bg p-2 shadow-sm">
      <SlidingOptionSelector
        rows={rows}
        value={value}
        onChange={onChange}
        optionHeight={44}
        optionHeightClassName="h-11"
        optionClassName="rounded-full px-3"
        indicatorClassName="rounded-full border border-brand bg-brand"
      />
    </View>
  );
}

function createTabOption(
  value: DiscoverTab,
  label: string,
  guideTargetId: string,
): SlidingOption<DiscoverTab> {
  return {
    value,
    accessibilityLabel: label,
    guideTargetId,
    guideTooltipPlacement: "bottom",
    children: ({ selected }: SlidingOptionRenderProps) => (
      <Text
        className={cn("text-sm font-bold", selected ? "text-primary-foreground" : "text-text")}
        numberOfLines={1}
      >
        {label}
      </Text>
    ),
  };
}
