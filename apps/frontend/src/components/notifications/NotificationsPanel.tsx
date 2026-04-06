"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import styles from "./NotificationsPanel.module.scss";
import { Button } from "@/components/ui/Button/Button";
import { Notification } from "@/types";
import {
  useAcceptSecretSantaInvite,
  useDeclineSecretSantaInvite
} from "@/hooks/use-secret-santa";

type Props = {
  notifications: Notification[];
  onClear?: () => void;
  onReadAll?: () => void;
  isLoading?: boolean;
  onMarkRead?: (id: string) => void;
};

export function NotificationsPanel({
  notifications,
  onClear,
  onReadAll,
  isLoading,
  onMarkRead
}: Props) {
  const t = useGT();
  const [pendingReadIds, setPendingReadIds] = useState<string[]>([]);
  const acceptInvite = useAcceptSecretSantaInvite();
  const declineInvite = useDeclineSecretSantaInvite();

  const handleHoverRead = (notification: Notification) => {
    if (
      notification.is_read ||
      !onMarkRead ||
      pendingReadIds.includes(notification.id)
    ) {
      return;
    }

    setPendingReadIds((current) => [...current, notification.id]);

    Promise.resolve(onMarkRead(notification.id)).finally(() => {
      setPendingReadIds((current) =>
        current.filter((id) => id !== notification.id)
      );
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <strong>{t("Notifications", { $id: "notifications.title" })}</strong>

        {notifications.length > 0 && (
          <div className={styles.actions}>
            {onReadAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReadAll}
                disabled={isLoading}
              >
                {t("Read all", { $id: "notifications.readAll" })}
              </Button>
            )}
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={isLoading}
              >
                {t("Clear", { $id: "notifications.clear" })}
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.empty}>
          {t("Loading notifications...", {
            $id: "notifications.loading"
          })}
        </div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          {t("No notifications", { $id: "notifications.empty" })}
        </div>
      ) : (
        <div className={styles.listWrap}>
          <ul className={styles.list}>
            {notifications.map((n) => {
              const isInvite = n.type === 0 && n.entity_id != null;
              const invitePending =
                acceptInvite.isPending || declineInvite.isPending;

              return (
                <li
                  key={n.id}
                  className={`${styles.item} ${!n.is_read ? styles.unread : ""}`}
                  onMouseEnter={() => handleHoverRead(n)}
                >
                  <div className={styles.itemContent}>
                    <p>{n.text}</p>
                    <span>{formatNotificationTime(n.created_at, t)}</span>
                  </div>
                  {isInvite && (
                    <div className={styles.inviteActions}>
                      <button
                        className={styles.accept}
                        onClick={() => acceptInvite.mutate(n.entity_id!)}
                        disabled={invitePending}
                      >
                        {acceptInvite.isPending
                          ? t("Accepting...", {
                              $id: "notifications.accepting"
                            })
                          : t("Accept", { $id: "notifications.accept" })}
                      </button>
                      <button
                        className={styles.decline}
                        onClick={() => declineInvite.mutate(n.entity_id!)}
                        disabled={invitePending}
                      >
                        {declineInvite.isPending
                          ? t("Declining...", {
                              $id: "notifications.declining"
                            })
                          : t("Decline", { $id: "notifications.decline" })}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatNotificationTime(
  createdAt: string,
  t: (message: string, options?: { $id?: string; n?: number }) => string
) {
  const date = new Date(createdAt);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return t("Now", { $id: "notifications.time.now" });
  if (diffMinutes < 60) {
    return t("{n}m", { n: diffMinutes, $id: "notifications.time.minutes" });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t("{n}h", { n: diffHours, $id: "notifications.time.hours" });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return t("{n}d ago", { n: diffDays, $id: "notifications.time.daysAgo" });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}
