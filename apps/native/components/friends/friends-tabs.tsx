import {
  SlidingOptionSelector,
  type SlidingOption,
  type SlidingOptionRenderProps,
} from "@/components/ui/sliding-option-selector";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

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
  const rows = React.useMemo<SlidingOption<FriendsTab>[][]>(
    () => [
      [
        createTabOption("friends", `${t("Friends")} ${friendsCount}`),
        createTabOption("groups", `${t("Groups")} ${groupsCount}`),
      ],
      [
        createTabOption("requests", `${t("Requests")} ${requestsCount}`),
        createTabOption("sent", `${t("Sent")} ${sentCount}`),
      ],
    ],
    [friendsCount, groupsCount, requestsCount, sentCount, t],
  );

  return (
    <View className="rounded-[28px] border border-border-subtle bg-card-bg p-2 shadow-sm">
      <SlidingOptionSelector
        rows={rows}
        value={value}
        onChange={onChange}
        optionHeight={44}
        optionHeightClassName="h-11"
        optionClassName="rounded-full px-3"
        indicatorClassName="rounded-full border border-brand bg-brand"
      />
    </View>
  );
}

function createTabOption(value: FriendsTab, label: string): SlidingOption<FriendsTab> {
  return {
    value,
    accessibilityLabel: label,
    children: ({ selected }: SlidingOptionRenderProps) => (
      <Text
        className={cn(
          "text-sm font-bold",
          selected ? "text-primary-foreground" : "text-text",
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    ),
  };
}
