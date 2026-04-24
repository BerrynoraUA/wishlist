"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";
import type { SettingsTab } from "@/types/settings";
import { SETTINGS_TAB_ORDER } from "@/types/settings";

type Props = {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ active, onChange }: Props) {
  const t = useGT();

  const items = useMemo<TabItem<SettingsTab>[]>(
    () =>
      SETTINGS_TAB_ORDER.map((id) => ({
        value: id,
        label: (
          {
            profile: t("Profile", { $id: "settings.tab.profile" }),
            account: t("Account", { $id: "settings.tab.account" }),
            notifications: t("Notifications", {
              $id: "settings.tab.notifications",
            }),
            appearance: t("Appearance", { $id: "settings.tab.appearance" }),
          } satisfies Record<SettingsTab, string>
        )[id],
      })),
    [t],
  );

  return (
    <Tabs
      items={items}
      active={active}
      onChange={onChange}
      size="md"
      as="nav"
      ariaLabel={t("Settings sections", { $id: "settings.tabs.nav" })}
    />
  );
}
