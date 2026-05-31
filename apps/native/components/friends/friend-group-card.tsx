import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { FriendGroup } from "@wishlist/backend/types/friends";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { Gift, Heart, MoreHorizontal, Star, Users, type LucideIcon } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

const GROUP_ICONS: Record<string, LucideIcon> = {
  users: Users,
  heart: Heart,
  star: Star,
  gift: Gift,
};

const GROUP_COLOR_CLASS: Record<string, { icon: string; surface: string }> = {
  pink: { icon: "text-pink-700 dark:text-pink-200", surface: "bg-pink-100 dark:bg-pink-950/50" },
  peach: {
    icon: "text-orange-700 dark:text-orange-200",
    surface: "bg-orange-100 dark:bg-orange-950/50",
  },
  blue: { icon: "text-sky-700 dark:text-sky-200", surface: "bg-sky-100 dark:bg-sky-950/50" },
  lavender: {
    icon: "text-violet-700 dark:text-violet-200",
    surface: "bg-violet-100 dark:bg-violet-950/50",
  },
  mint: {
    icon: "text-emerald-700 dark:text-emerald-200",
    surface: "bg-emerald-100 dark:bg-emerald-950/50",
  },
};

export function FriendGroupCard({
  group,
  onEdit,
  onDelete,
}: {
  group: FriendGroup;
  onEdit: (group: FriendGroup) => void;
  onDelete: (group: FriendGroup) => void;
}) {
  const t = useGT();
  const menuTriggerRef = React.useRef<TriggerRef>(null);
  const GroupIcon = GROUP_ICONS[group.icon] ?? Users;
  const colorClassName = GROUP_COLOR_CLASS[group.color] ?? GROUP_COLOR_CLASS.pink;

  return (
    <DropdownMenu className="relative">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Group actions")}
        onLongPress={() => menuTriggerRef.current?.open()}
        pressedScale={0.98}
        className="rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm"
      >
        <View className="flex-row items-start gap-3">
          <View
            className={cn(
              "size-12 items-center justify-center rounded-full",
              colorClassName.surface,
            )}
          >
            <Icon as={GroupIcon} className={cn("size-5", colorClassName.icon)} />
          </View>

          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-base font-extrabold text-text" numberOfLines={1}>
              {group.name}
            </Text>
            {group.description ? (
              <Text className="text-sm text-text-muted" numberOfLines={2}>
                {group.description}
              </Text>
            ) : null}
            <Text className="text-xs font-semibold text-text-muted">
              {t("{count} members", { count: group.member_count })}
            </Text>
          </View>

          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("Group actions")}
            onPress={(event) => {
              event.stopPropagation();
              menuTriggerRef.current?.open();
            }}
            className="size-10 items-center justify-center rounded-full active:bg-bg-muted"
          >
            <Icon as={MoreHorizontal} className="size-5 text-text-muted" />
          </AnimatedPressable>
        </View>
      </AnimatedPressable>
      <DropdownMenuTrigger asChild>
        <AnimatedPressable
          ref={menuTriggerRef}
          pointerEvents="none"
          className="absolute right-4 top-4 size-10 opacity-0"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-36">
        <DropdownMenuItem onPress={() => onEdit(group)}>
          <Text>{t("Edit")}</Text>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onPress={() => onDelete(group)}>
          <Text>{t("Delete")}</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
