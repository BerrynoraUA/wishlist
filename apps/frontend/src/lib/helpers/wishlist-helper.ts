import { Globe, Lock, Users, type LucideIcon } from "lucide-react";
import { WishlistAccent, WishlistVisibility } from "@/types/wishlist";

export const visibilityLabel: Record<WishlistVisibility, string> = {
  [WishlistVisibility.Public]: "Public",
  [WishlistVisibility.FriendsOnly]: "Friends only",
  [WishlistVisibility.Private]: "Private",
};

export const visibilityIcon: Record<WishlistVisibility, LucideIcon> = {
  [WishlistVisibility.Public]: Globe,
  [WishlistVisibility.FriendsOnly]: Users,
  [WishlistVisibility.Private]: Lock,
};

export const accentClass: Record<WishlistAccent, string> = {
  [WishlistAccent.Pink]: "pink",
  [WishlistAccent.Blue]: "blue",
  [WishlistAccent.Peach]: "peach",
  [WishlistAccent.Mint]: "mint",
  [WishlistAccent.Lavender]: "lavender",
};
