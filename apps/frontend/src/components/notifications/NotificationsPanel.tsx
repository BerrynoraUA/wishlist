"use client";

import styles from "./NotificationsPanel.module.scss";
import { Button } from "@/components/ui/Button/Button";
import { Notification } from "@/types";

type Props = {
  notifications: Notification[];
  onClear?: () => void;
  isLoading?: boolean;
  onMarkRead?: (id: string) => void;
};

export function NotificationsPanel({
  notifications,
  onClear,
  isLoading,
  onMarkRead,
}: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <strong>Notifications</strong>

        {notifications.length > 0 && onClear && (
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

      {isLoading ? (
        <div className={styles.empty}>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>No notifications</div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`${styles.item} ${!n.is_read ? styles.unread : ""}`}
              onClick={() => {
                if (!n.is_read && onMarkRead) onMarkRead(n.id);
              }}
            >
              <p>{n.text}</p>
              <span>{new Date(n.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
