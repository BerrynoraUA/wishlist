"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { Tabs, type TabItem } from "@/components/ui/Tabs/Tabs";

type TabValue = "friends" | "requests" | "sent";

type Props = {
  active: TabValue;
  friendsCount: number;
  requestsCount: number;
  sentCount?: number;
  onChange: (v: TabValue) => void;
};

export function FriendsTabs({
  active,
  friendsCount,
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
    [t, friendsCount, requestsCount, sentCount],
  );

  return <Tabs items={items} active={active} onChange={onChange} />;
}
