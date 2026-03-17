"use client";

import styles from "./NotificationSettings.module.scss";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "@/components/ui/Toggle/Toggle";
import { ProBadge } from "@/components/ui/ProBadge/ProBadge";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { UserPlus, Gift, TrendingDown, Mail } from "lucide-react";

export function NotificationSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { isPro } = useSubscription();

  function toggle(key: string, value: boolean) {
    updateSettings.mutate({ [key]: value });
  }

  if (isLoading || !settings) {
    return <p className={styles.loading}>Loading preferences…</p>;
  }

  return (
    <>
      <SettingsSection
        title="Push Notifications"
        description="Choose which notifications you receive in the app."
      >
        <div className={styles.row}>
          <div className={styles.rowInfo}>
            <div className={styles.rowIcon}>
              <UserPlus size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>Friend Requests</p>
              <p className={styles.rowHint}>
                When someone sends you a friend request
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
              <p className={styles.rowLabel}>Item Reservations</p>
              <p className={styles.rowHint}>
                When a friend reserves an item from your wishlist
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
                Sale Price Alerts
                {!isPro && (
                  <span className={styles.proBadge}>
                    <ProBadge size="sm" />
                  </span>
                )}
              </p>
              <p className={styles.rowHint}>
                When an item in your wishlist goes on sale
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
        title="Email Notifications"
        description="Manage email notifications from Wishly."
      >
        <div className={styles.row}>
          <div className={styles.rowInfo}>
            <div className={styles.rowIcon}>
              <Mail size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>Weekly Digest</p>
              <p className={styles.rowHint}>
                A summary of friend activity and upcoming events
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
