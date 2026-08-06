import { Gift, Heart, Star, Users, type LucideIcon } from "lucide-react-native";

/** Icon keys a friend group can be saved with. */
export const FRIEND_GROUP_ICON_VALUES = ["users", "heart", "star", "gift"] as const;

const FRIEND_GROUP_ICONS: Record<string, LucideIcon> = {
  users: Users,
  heart: Heart,
  star: Star,
  gift: Gift,
};

const FRIEND_GROUP_COLOR_CLASS: Record<string, { icon: string; surface: string }> = {
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

export const FRIEND_GROUP_ICON_OPTIONS = FRIEND_GROUP_ICON_VALUES.map((value) => ({
  value,
  icon: FRIEND_GROUP_ICONS[value],
}));

export function getFriendGroupIcon(icon: string | null | undefined) {
  return FRIEND_GROUP_ICONS[icon ?? ""] ?? Users;
}

export function getFriendGroupColorClass(color: string | null | undefined) {
  return FRIEND_GROUP_COLOR_CLASS[color ?? ""] ?? FRIEND_GROUP_COLOR_CLASS.pink;
}
