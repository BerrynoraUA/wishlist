import { ScrollableTabs, type ScrollableTab } from "@/components/ui/scrollable-tabs";
import type { IdeaStatusFilter } from "@/lib/feature-ideas";
import { useGT } from "gt-react-native";
import * as React from "react";

export function FeatureIdeasTabs({
  value,
  onChange,
}: {
  value: IdeaStatusFilter;
  onChange: (value: IdeaStatusFilter) => void;
}) {
  const t = useGT();
  const tabs = React.useMemo<ScrollableTab<IdeaStatusFilter>[]>(
    () => [
      { value: "all", label: t("All") },
      { value: "approved", label: t("Approved") },
      { value: "in_development", label: t("In Development") },
      { value: "done", label: t("Done") },
    ],
    [t],
  );

  return <ScrollableTabs tabs={tabs} value={value} onChange={onChange} />;
}
