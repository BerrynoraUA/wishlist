"use client";

import { useState } from "react";
import { useGT } from "gt-next";
import styles from "./NotificationsPanel.module.scss";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { Notification } from "@/types";
import { useAcceptSecretSantaInvite, useDeclineSecretSantaInvite } from "@/hooks/use-secret-santa";
import { useDeleteNotification } from "@/hooks/use-notifications";

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
  onMarkRead,
}: Props) {
  const t = useGT();
  const [pendingReadIds, setPendingReadIds] = useState<string[]>([]);
  const acceptInvite = useAcceptSecretSantaInvite();
  const declineInvite = useDeclineSecretSantaInvite();
  const deleteNotification = useDeleteNotification();
  const [pendingInviteActions, setPendingInviteActions] = useState<
    Record<string, "accept" | "decline">
  >({});

  const handleHoverRead = (notification: Notification) => {
    if (notification.is_read || !onMarkRead || pendingReadIds.includes(notification.id)) {
      return;
    }

    setPendingReadIds((current) => [...current, notification.id]);

    Promise.resolve(onMarkRead(notification.id)).finally(() => {
      setPendingReadIds((current) => current.filter((id) => id !== notification.id));
    });
  };

  const handleInviteAction = async (notification: Notification, action: "accept" | "decline") => {
    if (!notification.entity_id || pendingInviteActions[notification.id]) {
      return;
    }

    setPendingInviteActions((current) => ({
      ...current,
      [notification.id]: action,
    }));

    try {
      if (action === "accept") {
        await acceptInvite.mutateAsync(notification.entity_id);
      } else {
        await declineInvite.mutateAsync(notification.entity_id);
      }

      await deleteNotification.mutateAsync(notification.id);
    } finally {
      setPendingInviteActions((current) => {
        const next = { ...current };
        delete next[notification.id];
        return next;
      });
    }
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
                disabled={isLoading || notifications.every((n) => n.is_read)}
              >
                {t("Read all", { $id: "notifications.readAll" })}
              </Button>
            )}
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear} disabled={isLoading}>
                {t("Clear", { $id: "notifications.clear" })}
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gap: 12, padding: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Skeleton variant="circle" width={36} height={36} />
              <div style={{ flex: 1, display: "grid", gap: 4 }}>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="50%" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>{t("No notifications", { $id: "notifications.empty" })}</div>
      ) : (
        <div className={styles.listWrap}>
          <ul className={styles.list}>
            {notifications.map((n) => {
              const isInvite = n.type === 0 && n.entity_id != null;
              const pendingInviteAction = pendingInviteActions[n.id];
              const isAccepting = pendingInviteAction === "accept";
              const isDeclining = pendingInviteAction === "decline";
              const invitePending = isAccepting || isDeclining;

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
                      <Button
                        variant="success"
                        size="sm"
                        className={styles.accept}
                        onClick={() => handleInviteAction(n, "accept")}
                        disabled={invitePending}
                      >
                        {isAccepting
                          ? t("Accepting...", {
                              $id: "notifications.accepting",
                            })
                          : t("Accept", { $id: "notifications.accept" })}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className={styles.decline}
                        onClick={() => handleInviteAction(n, "decline")}
                        disabled={invitePending}
                      >
                        {isDeclining
                          ? t("Declining...", {
                              $id: "notifications.declining",
                            })
                          : t("Decline", { $id: "notifications.decline" })}
                      </Button>
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
  t: (message: string, options?: { $id?: string; n?: number }) => string,
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
    day: "numeric",
  });
}
