import { ScrollableTabs, type ScrollableTab } from "@/components/ui/scrollable-tabs";
import type { DiscoverTab } from "@/lib/discover";
import { useGT } from "gt-react-native";
import * as React from "react";

export function DiscoverTabs({
  value,
  onChange,
}: {
  value: DiscoverTab;
  onChange: (value: DiscoverTab) => void;
}) {
  const t = useGT();
  const tabs = React.useMemo<ScrollableTab<DiscoverTab>[]>(
    () => [
      { value: "wishlists", label: t("Wishlists"), guideTargetId: "discover-tab-wishlists" },
      { value: "available", label: t("Available"), guideTargetId: "discover-tab-available" },
      { value: "reserved", label: t("Reserved"), guideTargetId: "discover-tab-reserved" },
      { value: "purchased", label: t("Purchased"), guideTargetId: "discover-tab-purchased" },
    ],
    [t],
  );

  return (
    <ScrollableTabs tabs={tabs} value={value} onChange={onChange} className="bg-transparent" />
  );
}
