"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import styles from "./SettingsTabs.module.scss";
import type { SettingsTab } from "@/types/settings";
import { SETTINGS_TAB_ORDER } from "@/types/settings";

type Props = {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ active, onChange }: Props) {
  const t = useGT();

  const tabLabel = useMemo(
    () =>
      ({
        profile: t("Profile", { $id: "settings.tab.profile" }),
        account: t("Account", { $id: "settings.tab.account" }),
        notifications: t("Notifications", {
          $id: "settings.tab.notifications",
        }),
        appearance: t("Appearance", { $id: "settings.tab.appearance" }),
      }) satisfies Record<SettingsTab, string>,
    [t],
  );

  return (
    <nav
      className={styles.tabs}
      aria-label={t("Settings sections", { $id: "settings.tabs.nav" })}
    >
      {SETTINGS_TAB_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          className={`${styles.tab} ${active === id ? styles.active : ""}`}
          onClick={() => onChange(id)}
        >
          {tabLabel[id]}
        </button>
      ))}
    </nav>
  );
}
