import { ScrollableTabs, type ScrollableTab } from "@/components/ui/scrollable-tabs";
import { useGT } from "gt-react-native";
import * as React from "react";

export type FriendsTab = "friends" | "groups" | "requests" | "sent";

export function FriendsTabs({
  value,
  friendsCount,
  groupsCount,
  requestsCount,
  sentCount,
  onChange,
}: {
  value: FriendsTab;
  friendsCount: number;
  groupsCount: number;
  requestsCount: number;
  sentCount: number;
  onChange: (value: FriendsTab) => void;
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
    ],
    [friendsCount, groupsCount, requestsCount, sentCount, t],
  );

  return <ScrollableTabs tabs={tabs} value={value} onChange={onChange} />;
}
