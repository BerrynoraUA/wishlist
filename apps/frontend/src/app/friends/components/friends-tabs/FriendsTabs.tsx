"use client";

import { useMemo, type ReactNode } from "react";
import { useGT } from "gt-next";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";
import styles from "./FriendsTabs.module.scss";

type TabValue = "friends" | "groups" | "requests" | "sent";

type Props = {
  active: TabValue;
  friendsCount: number;
  groupsCount: number;
  requestsCount: number;
  sentCount?: number;
  action?: ReactNode;
  onChange: (v: TabValue) => void;
};

export function FriendsTabs({
  active,
  friendsCount,
  groupsCount,
  requestsCount,
  sentCount = 0,
  action,
  onChange,
}: Props) {
  const t = useGT();
  const items = useMemo<TabItem<TabValue>[]>(
    () => [
      {
        value: "friends",
        label: (
          <>
            {t("Friends", { $id: "friends.tabs.friends" })} {friendsCount}
          </>
        ),
      },
      {
        value: "groups",
        label: (
          <>
            {t("Groups", { $id: "friends.tabs.groups" })} {groupsCount}
          </>
        ),
      },
      {
        value: "requests",
        label: t("Requests", { $id: "friends.tabs.requests" }),
        badge: requestsCount,
      },
      {
        value: "sent",
        label: (
          <>
            {t("Sent", { $id: "friends.tabs.sent" })} {sentCount}
          </>
        ),
      },
    ],
    [t, friendsCount, groupsCount, requestsCount, sentCount],
  );

  return (
    <div className={styles.tabsRow}>
      <Tabs items={items} active={active} onChange={onChange} className={styles.tabs} />
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
