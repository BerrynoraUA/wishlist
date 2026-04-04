"use client";

import { useState } from "react";
import styles from "./NotificationsPanel.module.scss";
import { Button } from "@/components/ui/Button/Button";
import { Notification } from "@/types";
import {
  useAcceptSecretSantaInvite,
  useDeclineSecretSantaInvite,
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
  onMarkRead,
}: Props) {
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
        current.filter((id) => id !== notification.id),
      );
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <strong>Notifications</strong>

        {notifications.length > 0 && (
          <div className={styles.actions}>
            {onReadAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReadAll}
                disabled={isLoading}
              >
                Read all
              </Button>
            )}
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={isLoading}
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.empty}>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>No notifications</div>
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
                    <span>{formatNotificationTime(n.created_at)}</span>
                  </div>
                  {isInvite && (
                    <div className={styles.inviteActions}>
                      <button
                        className={styles.accept}
                        onClick={() => acceptInvite.mutate(n.entity_id!)}
                        disabled={invitePending}
                      >
                        {acceptInvite.isPending ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        className={styles.decline}
                        onClick={() => declineInvite.mutate(n.entity_id!)}
                        disabled={invitePending}
                      >
                        {declineInvite.isPending ? "Declining..." : "Decline"}
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

function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
