import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useGT } from "gt-react-native";
import { View } from "react-native";

export type FriendsTab = "friends" | "groups" | "requests" | "sent";

type FriendTabOption = {
  value: FriendsTab;
  label: string;
};

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
  const rows: FriendTabOption[][] = [
    [
      { value: "friends", label: `${t("Friends")} ${friendsCount}` },
      { value: "groups", label: `${t("Groups")} ${groupsCount}` },
    ],
    [
      { value: "requests", label: `${t("Requests")} ${requestsCount}` },
      { value: "sent", label: `${t("Sent")} ${sentCount}` },
    ],
  ];

  return (
    <View className="gap-2 rounded-[28px] border border-border-subtle bg-card-bg p-2 shadow-sm">
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-2">
          {row.map((option) => {
            const selected = value === option.value;

            return (
              <AnimatedPressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange(option.value)}
                className={cn(
                  "h-11 flex-1 items-center justify-center rounded-full border border-border-subtle bg-bg-subtle px-3",
                  selected && "border-brand bg-brand",
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-bold",
                    selected ? "text-primary-foreground" : "text-text",
                  )}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
