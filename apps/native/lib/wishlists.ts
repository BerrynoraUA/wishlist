import { Globe, Lock, UserCheck, Users, type LucideIcon } from "lucide-react-native";
import { WishlistAccent, WishlistVisibility, type WishlistFormValues } from "@/types/wishlist";

export const WISHLIST_PAGE_SIZE = 8;
export const DEFAULT_WISHLIST_SORT = "newest";

export const WISHLIST_VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", icon: Globe, visibility: WishlistVisibility.Public },
  {
    value: "friends",
    label: "Friends only",
    icon: Users,
    visibility: WishlistVisibility.FriendsOnly,
  },
  {
    value: "selected-friends",
    label: "Selected friends",
    icon: UserCheck,
    visibility: WishlistVisibility.SelectedFriends,
  },
  { value: "private", label: "Private", icon: Lock, visibility: WishlistVisibility.Private },
] as const;

export const WISHLIST_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "items-most", label: "Most items" },
  { value: "items-least", label: "Fewest items" },
] as const;

export const WISHLIST_VISIBILITY_MAP: Record<string, WishlistVisibility> = {
  public: WishlistVisibility.Public,
  friends: WishlistVisibility.FriendsOnly,
  "selected-friends": WishlistVisibility.SelectedFriends,
  private: WishlistVisibility.Private,
};

export const WISHLIST_VISIBILITY_LABELS: Record<WishlistVisibility, string> = {
  [WishlistVisibility.Public]: "Public",
  [WishlistVisibility.FriendsOnly]: "Friends only",
  [WishlistVisibility.Private]: "Private",
  [WishlistVisibility.SelectedFriends]: "Selected friends",
};

export const WISHLIST_VISIBILITY_ICONS: Record<WishlistVisibility, LucideIcon> = {
  [WishlistVisibility.Public]: Globe,
  [WishlistVisibility.FriendsOnly]: Users,
  [WishlistVisibility.Private]: Lock,
  [WishlistVisibility.SelectedFriends]: UserCheck,
};

export const WISHLIST_ACCENT_OPTIONS = [
  { value: WishlistAccent.Pink, label: "Pink", key: "pink" },
  { value: WishlistAccent.Blue, label: "Blue", key: "blue" },
  { value: WishlistAccent.Peach, label: "Peach", key: "peach" },
  { value: WishlistAccent.Mint, label: "Mint", key: "mint" },
  { value: WishlistAccent.Lavender, label: "Lavender", key: "lavender" },
] as const;

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
  return WISHLIST_ACCENT_OPTIONS.find((option) => option.value === Number(accent))?.key ?? "pink";
}

export function getWishlistAccentClass(accent: WishlistAccent | null | undefined) {
  switch (getWishlistAccentKey(accent)) {
    case "blue":
      return "bg-gradient-accent-blue";
    case "peach":
      return "bg-gradient-accent-peach";
    case "mint":
      return "bg-gradient-accent-mint";
    case "lavender":
      return "bg-gradient-accent-lavender";
    default:
      return "bg-gradient-accent-pink";
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
