"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";

type TabValue = "friends" | "groups" | "requests" | "sent";

type Props = {
  active: TabValue;
  friendsCount: number;
  groupsCount: number;
  requestsCount: number;
  sentCount?: number;
  onChange: (v: TabValue) => void;
};

export function FriendsTabs({
  active,
  friendsCount,
  groupsCount,
  requestsCount,
  sentCount = 0,
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

  return <Tabs items={items} active={active} onChange={onChange} />;
}
