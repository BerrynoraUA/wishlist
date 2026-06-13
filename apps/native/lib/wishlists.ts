import { Globe, Lock, UserCheck, Users, type LucideIcon } from "lucide-react-native";
import type { TranslateFn } from "@/lib/translate-fn";
import {
  WishlistAccent,
  WishlistVisibility,
  type WishlistFormValues,
} from "@wishlist/backend/types/wishlist";

export const WISHLIST_PAGE_SIZE = 8;
export const DEFAULT_WISHLIST_SORT = "newest";
export const SELECTED_GROUPS_ACCESS_TYPE = 2;
export const SELECTED_FRIENDS_ACCESS_TYPE = 3;

const WISHLIST_ACCENT_KEYS = [
  { value: WishlistAccent.Pink, key: "pink" },
  { value: WishlistAccent.Blue, key: "blue" },
  { value: WishlistAccent.Peach, key: "peach" },
  { value: WishlistAccent.Mint, key: "mint" },
  { value: WishlistAccent.Lavender, key: "lavender" },
] as const;

export type WishlistVisibilityOption = {
  value: "public" | "friends" | "selected-friends" | "private";
  label: string;
  icon: LucideIcon;
  visibility: WishlistVisibility;
  surfaceClassName: string;
  itemClassName: string;
};

export function getWishlistVisibilityOptions(t: TranslateFn): WishlistVisibilityOption[] {
  return [
    {
      value: "public",
      label: t("Public"),
      icon: Globe,
      visibility: WishlistVisibility.Public,
      surfaceClassName: "bg-success-bg",
      itemClassName: "mb-1 last:mb-0 active:bg-success-bg/85 dark:active:bg-success-bg/90",
    },
    {
      value: "friends",
      label: t("Friends only"),
      icon: Users,
      visibility: WishlistVisibility.FriendsOnly,
      surfaceClassName: "bg-info-bg",
      itemClassName: "mb-1 last:mb-0 active:bg-info-bg/85 dark:active:bg-info-bg/90",
    },
    {
      value: "selected-friends",
      label: t("Selected friends"),
      icon: UserCheck,
      visibility: WishlistVisibility.SelectedFriends,
      surfaceClassName: "bg-brand-alpha-12",
      itemClassName: "mb-1 last:mb-0 active:bg-brand-alpha-20",
    },
    {
      value: "private",
      label: t("Private"),
      icon: Lock,
      visibility: WishlistVisibility.Private,
      surfaceClassName: "bg-danger-bg",
      itemClassName: "mb-1 last:mb-0 active:bg-danger-bg/85 dark:active:bg-danger-bg/90",
    },
  ];
}

export type WishlistSortOption = {
  value: string;
  label: string;
};

export function getWishlistSortOptions(t: TranslateFn): WishlistSortOption[] {
  return [
    { value: "newest", label: t("Newest first") },
    { value: "oldest", label: t("Oldest first") },
    { value: "name-asc", label: t("Name A to Z") },
    { value: "name-desc", label: t("Name Z to A") },
    { value: "items-most", label: t("Most items") },
    { value: "items-least", label: t("Fewest items") },
  ];
}

export const WISHLIST_VISIBILITY_MAP: Record<string, WishlistVisibility> = {
  public: WishlistVisibility.Public,
  friends: WishlistVisibility.FriendsOnly,
  "selected-friends": WishlistVisibility.SelectedFriends,
  private: WishlistVisibility.Private,
};

export function getWishlistVisibilityLabels(t: TranslateFn): Record<WishlistVisibility, string> {
  return {
    [WishlistVisibility.Public]: t("Public"),
    [WishlistVisibility.FriendsOnly]: t("Friends only"),
    [WishlistVisibility.Private]: t("Private"),
    [WishlistVisibility.SelectedFriends]: t("Selected friends"),
  };
}

export const WISHLIST_VISIBILITY_ICONS: Record<WishlistVisibility, LucideIcon> = {
  [WishlistVisibility.Public]: Globe,
  [WishlistVisibility.FriendsOnly]: Users,
  [WishlistVisibility.Private]: Lock,
  [WishlistVisibility.SelectedFriends]: UserCheck,
};

export function getWishlistDisplayVisibility(wishlist: {
  visibility_type: WishlistVisibility;
  access_type?: number | null;
}): WishlistVisibility {
  if (
    wishlist.visibility_type === WishlistVisibility.SelectedFriends ||
    wishlist.access_type === SELECTED_FRIENDS_ACCESS_TYPE ||
    wishlist.access_type === SELECTED_GROUPS_ACCESS_TYPE
  ) {
    return WishlistVisibility.SelectedFriends;
  }

  return wishlist.visibility_type;
}

export type WishlistAccentOption = {
  value: WishlistAccent;
  label: string;
  key: string;
};

export function getWishlistAccentOptions(t: TranslateFn): WishlistAccentOption[] {
  return [
    { value: WishlistAccent.Pink, label: t("Pink"), key: "pink" },
    { value: WishlistAccent.Blue, label: t("Blue"), key: "blue" },
    { value: WishlistAccent.Peach, label: t("Peach"), key: "peach" },
    { value: WishlistAccent.Mint, label: t("Mint"), key: "mint" },
    { value: WishlistAccent.Lavender, label: t("Lavender"), key: "lavender" },
  ];
}

export const EMPTY_WISHLIST_FORM: WishlistFormValues = {
  title: "",
  description: "",
  visibility: WishlistVisibility.FriendsOnly,
  accent: WishlistAccent.Pink,
  eventDate: "",
  imageUrl: "",
};

export function normalizeSearchQuery(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function paginationFlags(page: number, itemsCount: number, pageSize: number) {
  return {
    hasNextPage: itemsCount === pageSize,
    hasPrevPage: page > 1,
    showPagination: itemsCount === pageSize || page > 1,
    totalForPagination: itemsCount === pageSize ? page + 1 : page,
  };
}

export function hasActiveFilters(search: string, visibility: string[]) {
  return search.trim() !== "" || visibility.length > 0;
}

export function getWishlistAccentKey(accent: WishlistAccent | null | undefined) {
  return WISHLIST_ACCENT_KEYS.find((option) => option.value === Number(accent))?.key ?? "pink";
}

export function getWishlistAccentClass(accent: WishlistAccent | null | undefined) {
  switch (getWishlistAccentKey(accent)) {
    case "blue":
      return "bg-linear-135 from-sky-300 via-blue-400 to-blue-600";
    case "peach":
      return "bg-linear-135 from-amber-200 via-orange-300 to-amber-500";
    case "mint":
      return "bg-linear-135 from-emerald-200 via-teal-300 to-emerald-500";
    case "lavender":
      return "bg-linear-135 from-violet-200 via-purple-300 to-violet-500";
    default:
      return "bg-linear-135 from-pink-300 via-pink-400 to-pink-600";
  }
}

export function toWishlistFormValues(wishlist?: {
  title: string;
  description: string | null;
  visibility_type: WishlistVisibility;
  accent_type: WishlistAccent;
  event_date: string | null;
  image_url: string | null;
}): WishlistFormValues {
  if (!wishlist) return EMPTY_WISHLIST_FORM;

  return {
    title: wishlist.title,
    description: wishlist.description ?? "",
    visibility: wishlist.visibility_type,
    accent: wishlist.accent_type,
    eventDate: wishlist.event_date?.slice(0, 10) ?? "",
    imageUrl: wishlist.image_url ?? "",
  };
}

export function parseEventDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

export function getDisplayName(nameSource?: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = nameSource?.user_metadata ?? {};
  const rawFullName = metadata.full_name ?? metadata.name;
  const rawFirstName = metadata.first_name;
  const rawLastName = metadata.last_name;
  const fullName =
    (typeof rawFullName === "string" && rawFullName.trim()) ||
    [
      typeof rawFirstName === "string" ? rawFirstName : undefined,
      typeof rawLastName === "string" ? rawLastName : undefined,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (fullName) return fullName;
  if (nameSource?.email) return nameSource.email.split("@")[0];
  return "there";
}
