import {
  Clock3,
  Funnel,
  Globe,
  Lock,
  PackageCheck,
  PackageOpen,
  Users,
} from "lucide-react";
import { WishlistVisibility } from "@/types/wishlist";

// ─── Item Status ───────────────────────────────────────────
export const ITEM_STATUS_OPTIONS = [
  { value: "available", label: "Available", icon: <PackageOpen size={13} /> },
  { value: "reserved", label: "Reserved", icon: <Clock3 size={13} /> },
  { value: "purchased", label: "Purchased", icon: <PackageCheck size={13} /> },
];

export const ITEM_STATUS_MAP: Record<string, number> = {
  available: 0,
  reserved: 1,
  purchased: 2,
};

export const ITEM_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  purchased: "Purchased",
};

// ─── Item Priority ─────────────────────────────────────────
export const ITEM_PRIORITY_OPTIONS = [
  { value: "3", label: "High", icon: <Funnel size={13} /> },
  { value: "2", label: "Medium", icon: <Funnel size={13} /> },
  { value: "1", label: "Low", icon: <Funnel size={13} /> },
];

export const ITEM_PRIORITY_LABELS: Record<string, string> = {
  "1": "Low",
  "2": "Medium",
  "3": "High",
};

// ─── Item Sort ─────────────────────────────────────────────
export const ITEM_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "price-high", label: "Highest price" },
  { value: "price-low", label: "Lowest price" },
  { value: "priority-high", label: "Highest priority" },
  { value: "priority-low", label: "Lowest priority" },
];

// ─── Wishlist Visibility ───────────────────────────────────
export const WISHLIST_VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", icon: <Globe size={13} /> },
  { value: "friends", label: "Friends only", icon: <Users size={13} /> },
  { value: "private", label: "Private", icon: <Lock size={13} /> },
];

export const WISHLIST_VISIBILITY_MAP: Record<string, WishlistVisibility> = {
  public: WishlistVisibility.Public,
  friends: WishlistVisibility.FriendsOnly,
  private: WishlistVisibility.Private,
};

export const WISHLIST_VISIBILITY_LABELS: Record<string, string> = {
  public: "Public",
  friends: "Friends only",
  private: "Private",
};

// ─── Wishlist Sort ─────────────────────────────────────────
export const WISHLIST_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "items-most", label: "Most items" },
  { value: "items-least", label: "Fewest items" },
];

// ─── Shared Defaults ───────────────────────────────────────
export const DEFAULT_SORT = "newest";
