"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../layout/TopNav.module.scss";
import { Bell } from "lucide-react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import {
  useDeleteAllNotifications,
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
} from "@/hooks/use-notifications";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useNotifications({ limit: 20 });

  const { mutateAsync: deleteAll, isPending: isDeleting } =
    useDeleteAllNotifications();

  const { mutateAsync: markRead } = useMarkNotificationAsRead();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={styles.notification} ref={ref}>
      <div className={styles.bell} onClick={() => setOpen((prev) => !prev)}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </div>

      {open && (
        <NotificationsPanel
          notifications={notifications}
          onClear={async () => {
            await deleteAll();
            refetch();
          }}
          isLoading={isLoading || isDeleting}
          onMarkRead={async (id) => {
            await markRead(id);
            refetch();
          }}
        />
      )}
    </div>
  );
}
