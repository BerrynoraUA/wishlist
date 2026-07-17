import { ScrollableTabs, type ScrollableTab } from "@/components/ui/scrollable-tabs";
import type { BugStatusFilter } from "@/lib/bug-reports";
import { useGT } from "gt-react-native";
import * as React from "react";

export function BugReportsTabs({
  value,
  onChange,
}: {
  value: BugStatusFilter;
  onChange: (value: BugStatusFilter) => void;
}) {
  const t = useGT();
  const tabs = React.useMemo<ScrollableTab<BugStatusFilter>[]>(
    () => [
      { value: "all", label: t("All") },
      { value: "confirmed", label: t("Confirmed") },
      { value: "in_progress", label: t("In Dev") },
      { value: "fixed", label: t("Fixed") },
    ],
    [t],
  );

  return <ScrollableTabs tabs={tabs} value={value} onChange={onChange} />;
}

