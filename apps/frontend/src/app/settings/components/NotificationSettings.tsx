"use client";

import { useGT } from "gt-next";
import styles from "./NotificationSettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "@/components/ui/Toggle/Toggle";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { UserPlus, Gift } from "lucide-react";

export function NotificationSettings() {
  const t = useGT();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  function toggle(key: string, value: boolean) {
    updateSettings.mutate({ [key]: value });
  }

  if (isLoading || !settings) {
    return (
      <p className={styles.loading}>
        {t("Loading preferences…", {
          $id: "settings.notifications.loading",
        })}
      </p>
    );
  }

  return (
    <>
      <SettingsSection
        title={t("Push Notifications", {
          $id: "settings.notifications.pushTitle",
        })}
        description={t(
          "Choose which notifications you receive in the app.",
          { $id: "settings.notifications.pushDescription" },
        )}
      >
        <div className={styles.row}>
          <div className={styles.rowInfo}>
            <div className={styles.rowIcon}>
              <UserPlus size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>
                {t("Friend Requests", {
                  $id: "settings.notifications.friendRequests",
                })}
              </p>
              <p className={styles.rowHint}>
                {t("When someone sends you a friend request", {
                  $id: "settings.notifications.friendRequestsHint",
                })}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.notify_friend_requests}
            onChange={(v) => toggle("notify_friend_requests", v)}
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <div className={styles.rowInfo}>
            <div className={styles.rowIcon}>
              <Gift size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>
                {t("Item Reservations", {
                  $id: "settings.notifications.itemReservations",
                })}
              </p>
              <p className={styles.rowHint}>
                {t("When a friend reserves an item from your wishlist", {
                  $id: "settings.notifications.itemReservationsHint",
                })}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.notify_reservations}
            onChange={(v) => toggle("notify_reservations", v)}
          />
        </div>

      </SettingsSection>
    </>
  );
}
