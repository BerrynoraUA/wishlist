import { Globe, Lock, Users, type LucideIcon } from "lucide-react";
import type { WishlistColorIndex } from "@/types/settings";
import { WishlistAccent, WishlistVisibility } from "@/types/wishlist";

export type WishlistPrivacyOption = "Public" | "Friends" | "Private";
export type WishlistColorOption = "pink" | "peach" | "blue" | "lavender" | "mint";

type TranslateFn = (message: string, options?: Record<string, unknown>) => string;

export const WISHLIST_COLOR_OPTIONS: WishlistColorOption[] = [
  "pink",
  "peach",
  "blue",
  "lavender",
  "mint",
];

export const WISHLIST_VISIBILITY_BY_PRIVACY: Record<WishlistPrivacyOption, WishlistVisibility> = {
  Public: WishlistVisibility.Public,
  Friends: WishlistVisibility.FriendsOnly,
  Private: WishlistVisibility.Private,
};

export const WISHLIST_PRIVACY_BY_VISIBILITY: Record<WishlistVisibility, WishlistPrivacyOption> = {
  [WishlistVisibility.Public]: "Public",
  [WishlistVisibility.FriendsOnly]: "Friends",
  [WishlistVisibility.Private]: "Private",
};

export const WISHLIST_VISIBILITY_ICONS: Record<WishlistVisibility, LucideIcon> = {
  [WishlistVisibility.Public]: Globe,
  [WishlistVisibility.FriendsOnly]: Users,
  [WishlistVisibility.Private]: Lock,
};

export const WISHLIST_COLOR_BY_ACCENT: Record<WishlistAccent, WishlistColorOption> = {
  [WishlistAccent.Pink]: "pink",
  [WishlistAccent.Blue]: "blue",
  [WishlistAccent.Peach]: "peach",
  [WishlistAccent.Mint]: "mint",
  [WishlistAccent.Lavender]: "lavender",
};

export const WISHLIST_ACCENT_BY_COLOR: Record<WishlistColorOption, WishlistAccent> = {
  pink: WishlistAccent.Pink,
  peach: WishlistAccent.Peach,
  blue: WishlistAccent.Blue,
  lavender: WishlistAccent.Lavender,
  mint: WishlistAccent.Mint,
};

export function getWishlistAccentClass(
  accent: WishlistAccent | null | undefined,
): WishlistColorOption {
  if (accent == null) return "pink";
  return (
    WISHLIST_COLOR_BY_ACCENT[accent] ??
    WISHLIST_COLOR_BY_ACCENT[Number(accent) as WishlistAccent] ??
    "pink"
  );
}

export function getWishlistColorByAccent(
  accent: WishlistAccent | null | undefined,
): WishlistColorOption {
  return getWishlistAccentClass(accent);
}

export function getWishlistAccentByColor(color: WishlistColorOption): WishlistAccent {
  return WISHLIST_ACCENT_BY_COLOR[color];
}

export function getWishlistColorByIndex(
  index: WishlistColorIndex | number | null | undefined,
): WishlistColorOption {
  return WISHLIST_COLOR_OPTIONS[index ?? 0] ?? "pink";
}

export function getWishlistColorIndex(color: WishlistColorOption): WishlistColorIndex {
  const index = WISHLIST_COLOR_OPTIONS.indexOf(color);
  return (index >= 0 ? index : 0) as WishlistColorIndex;
}

export function getWishlistVisibilityLabels(t: TranslateFn): Record<WishlistVisibility, string> {
  return {
    [WishlistVisibility.Public]: t("Public", {
      $id: "wishlist.visibility.public",
      $context: "wishlist visibility option",
    }),
    [WishlistVisibility.FriendsOnly]: t("Friends only", {
      $id: "wishlist.visibility.friendsOnly",
      $context: "wishlist visibility option",
    }),
    [WishlistVisibility.Private]: t("Private", {
      $id: "wishlist.visibility.private",
      $context: "wishlist visibility option",
    }),
  };
}

export function getWishlistPrivacyOptions(t: TranslateFn) {
  return [
    {
      value: "Public" as const,
      icon: Globe,
      title: t("Public", { $id: "wishlist.privacy.public" }),
      subtitle: t("Anyone can view", {
        $id: "wishlist.privacy.publicSubtitle",
      }),
    },
    {
      value: "Friends" as const,
      icon: Users,
      title: t("Friends Only", { $id: "wishlist.privacy.friends" }),
      subtitle: t("Only your friends", {
        $id: "wishlist.privacy.friendsSubtitle",
      }),
    },
    {
      value: "Private" as const,
      icon: Lock,
      title: t("Private", { $id: "wishlist.privacy.private" }),
      subtitle: t("Only you", {
        $id: "wishlist.privacy.privateSubtitle",
      }),
    },
  ];
}

export function getWishlistAccentSwatches(t: TranslateFn) {
  return [
    {
      id: WishlistAccent.Pink,
      cssClass: "pink" as const,
      label: t("Pink", { $id: "settings.appearance.accent.pink" }),
    },
    {
      id: WishlistAccent.Blue,
      cssClass: "blue" as const,
      label: t("Blue", { $id: "settings.appearance.accent.blue" }),
    },
    {
      id: WishlistAccent.Peach,
      cssClass: "peach" as const,
      label: t("Peach", { $id: "settings.appearance.accent.peach" }),
    },
    {
      id: WishlistAccent.Mint,
      cssClass: "mint" as const,
      label: t("Mint", { $id: "settings.appearance.accent.mint" }),
    },
    {
      id: WishlistAccent.Lavender,
      cssClass: "lavender" as const,
      label: t("Lavender", {
        $id: "settings.appearance.accent.lavender",
      }),
    },
  ];
}

export function getWishlistColorSwatches(t: TranslateFn) {
  return [
    {
      id: 0 as WishlistColorIndex,
      cssClass: "pink" as const,
      label: t("Pink", { $id: "settings.appearance.wishlistColor.pink" }),
    },
    {
      id: 1 as WishlistColorIndex,
      cssClass: "peach" as const,
      label: t("Peach", { $id: "settings.appearance.wishlistColor.peach" }),
    },
    {
      id: 2 as WishlistColorIndex,
      cssClass: "blue" as const,
      label: t("Blue", { $id: "settings.appearance.wishlistColor.blue" }),
    },
    {
      id: 3 as WishlistColorIndex,
      cssClass: "lavender" as const,
      label: t("Lavender", {
        $id: "settings.appearance.wishlistColor.lavender",
      }),
    },
    {
      id: 4 as WishlistColorIndex,
      cssClass: "mint" as const,
      label: t("Mint", { $id: "settings.appearance.wishlistColor.mint" }),
    },
  ];
}
