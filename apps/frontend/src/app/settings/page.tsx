"use client";

import { useGT } from "gt-next";
import styles from "./settings.module.scss";
import { SettingsTabs } from "./components/settings-tabs/SettingsTabs";
import { ProfileSettings } from "./components/profile-settings/ProfileSettings";
import { AccountSettings } from "./components/account-settings/AccountSettings";
import { NotificationSettings } from "./components/notification-settings/NotificationSettings";
import { AppearanceSettings } from "./components/appearance-settings/AppearanceSettings";
import { useSettingsPage } from "./hooks/use-settings-page";

export default function SettingsPage() {
  const t = useGT();
  const { tab, setTab } = useSettingsPage();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>{t("Settings", { $id: "settings.page.title" })}</h1>

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
