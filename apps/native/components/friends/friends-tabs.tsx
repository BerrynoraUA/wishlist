import { ScrollableTabs, type ScrollableTab } from "@/components/ui/scrollable-tabs";
import { useGT } from "gt-react-native";
import * as React from "react";
import type { SharedValue } from "react-native-reanimated";

export type FriendsTab = "friends" | "groups" | "requests" | "sent" | "blocked";

export function FriendsTabs({
  value,
  friendsCount,
  groupsCount,
  requestsCount,
  sentCount,
  blockedCount,
  onChange,
  opacity,
}: {
  value: FriendsTab;
  friendsCount: number;
  groupsCount: number;
  requestsCount: number;
  sentCount: number;
  blockedCount: number;
  onChange: (value: FriendsTab) => void;
  opacity?: SharedValue<number>;
}) {
  const t = useGT();
  const tabs = React.useMemo<ScrollableTab<FriendsTab>[]>(
    () => [
      {
        value: "friends",
        label: t("Friends"),
        count: friendsCount,
        guideTargetId: "friends-tab-friends",
      },
      {
        value: "groups",
        label: t("Groups"),
        count: groupsCount,
        guideTargetId: "friends-tab-groups",
      },
      {
        value: "requests",
        label: t("Requests"),
        count: requestsCount,
        guideTargetId: "friends-tab-requests",
      },
      {
        value: "sent",
        label: t("Sent"),
        count: sentCount,
        guideTargetId: "friends-tab-sent",
      },
      {
        value: "blocked",
        label: t("Blocked"),
        count: blockedCount,
      },
    ],
    [friendsCount, groupsCount, requestsCount, sentCount, blockedCount, t],
  );

  return <ScrollableTabs tabs={tabs} value={value} onChange={onChange} opacity={opacity} />;
}
