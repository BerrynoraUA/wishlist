"use client";

import { useGT } from "gt-next";
import styles from "./NotificationSettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "@/components/ui/Toggle/Toggle";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { UserPlus, Gift, TrendingDown, Mail } from "lucide-react";

export function NotificationSettings() {
  const t = useGT();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { isPro } = useSubscription();

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

        <div className={styles.divider} />

        <div className={styles.row}>
          <div className={styles.rowInfo}>
            <div className={styles.rowIcon}>
              <TrendingDown size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>
                {t("Sale Price Alerts", {
                  $id: "settings.notifications.saleAlerts",
                })}
                {!isPro && (
                  <span className={styles.proBadge}>
                    <ProBadge size="sm" />
                  </span>
                )}
              </p>
              <p className={styles.rowHint}>
                {t("When an item in your wishlist goes on sale", {
                  $id: "settings.notifications.saleAlertsHint",
                })}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.notify_sale_alerts}
            onChange={(v) => toggle("notify_sale_alerts", v)}
            disabled={!isPro}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("Email Notifications", {
          $id: "settings.notifications.emailTitle",
        })}
        description={t("Manage email notifications from Wishly.", {
          $id: "settings.notifications.emailDescription",
        })}
      >
        <div className={styles.row}>
          <div className={styles.rowInfo}>
            <div className={styles.rowIcon}>
              <Mail size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>
                {t("Weekly Digest", {
                  $id: "settings.notifications.weeklyDigest",
                })}
              </p>
              <p className={styles.rowHint}>
                {t("A summary of friend activity and upcoming events", {
                  $id: "settings.notifications.weeklyDigestHint",
                })}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.email_digest}
            onChange={(v) => toggle("email_digest", v)}
          />
        </div>
      </SettingsSection>
    </>
  );
}
