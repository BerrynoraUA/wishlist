"use client";

import { useState } from "react";
import styles from "./settings.module.scss";
import { SettingsTabs } from "./components/SettingsTabs";
import { ProfileSettings } from "./components/ProfileSettings";
import { AccountSettings } from "./components/AccountSettings";
import { NotificationSettings } from "./components/NotificationSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import type { SettingsTab } from "@/types/settings";

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Settings</h1>

        <SettingsTabs active={tab} onChange={setTab} />

        <div className={styles.content}>
          {tab === "profile" && <ProfileSettings />}
          {tab === "account" && <AccountSettings />}
          {tab === "notifications" && <NotificationSettings />}
          {tab === "appearance" && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}
