"use client";

import { useGT } from "gt-next";
import styles from "./NotificationSettings.module.scss";
import { SettingsSection } from "../settings-section/SettingsSection";
import { Toggle } from "@/components/ui/Toggle/Toggle";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { CalendarDays, Gift, ListPlus, PartyPopper, UserPlus } from "lucide-react";

export function NotificationSettings() {
  const t = useGT();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  function toggle(key: string, value: boolean) {
    updateSettings.mutate({ [key]: value });
  }

  if (isLoading || !settings) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <Skeleton variant="text" width={160} />
            <Skeleton width={44} height={24} borderRadius={12} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <SettingsSection
        title={t("Push Notifications", {
          $id: "settings.notifications.pushTitle",
        })}
        description={t("Choose which notifications you receive in the app.", {
          $id: "settings.notifications.pushDescription",
        })}
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
              <PartyPopper size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>
                {t("Secret Santa Invites", {
                  $id: "settings.notifications.secretSanta",
                })}
              </p>
              <p className={styles.rowHint}>
                {t("When someone invites you to a Secret Santa event", {
                  $id: "settings.notifications.secretSantaHint",
                })}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.notify_secret_santa}
            onChange={(v) => toggle("notify_secret_santa", v)}
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
              <ListPlus size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>
                {t("New Wishlists", {
                  $id: "settings.notifications.newWishlists",
                })}
              </p>
              <p className={styles.rowHint}>
                {t("When a friend creates a public or friends-only wishlist", {
                  $id: "settings.notifications.newWishlistsHint",
                })}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.notify_new_wishlists}
            onChange={(v) => toggle("notify_new_wishlists", v)}
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <div className={styles.rowInfo}>
            <div className={styles.rowIcon}>
              <CalendarDays size={16} />
            </div>
            <div>
              <p className={styles.rowLabel}>
                {t("Upcoming Events", {
                  $id: "settings.notifications.upcomingEvents",
                })}
              </p>
              <p className={styles.rowHint}>
                {t("When a friend's wishlist event is coming up", {
                  $id: "settings.notifications.upcomingEventsHint",
                })}
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.notify_upcoming_events}
            onChange={(v) => toggle("notify_upcoming_events", v)}
          />
        </div>
      </SettingsSection>
    </>
  );
}
