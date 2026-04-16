"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";

type Props = {
  active: "add" | "preview";
  previewCount: number;
  onChange: (v: "add" | "preview") => void;
};

export function ItemsTabs({ active, previewCount, onChange }: Props) {
  const t = useGT();
  const items = useMemo<TabItem<"add" | "preview">[]>(
    () => [
      { value: "add", label: t("Add Link", { $id: "items.tabs.addLink" }) },
      {
        value: "preview",
        label: t("Preview", { $id: "items.tabs.preview" }),
        badge: previewCount,
      },
    ],
    [t, previewCount],
  );

  return <Tabs items={items} active={active} onChange={onChange} />;
}
