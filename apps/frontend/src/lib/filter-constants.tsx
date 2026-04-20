import {
  Clock3,
  Globe,
  Lock,
  PackageCheck,
  PackageOpen,
  Users,
} from "lucide-react";
import { WishlistVisibility } from "@/types/wishlist";

// ─── Priority Bar Icons ────────────────────────────────────
function PriorityBars({ count, color }: { count: number; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 2,
        alignItems: "flex-end",
        height: 13,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 5 + i * 3,
            borderRadius: 1,
            background: color,
          }}
        />
      ))}
    </span>
  );
}

// ─── Item Status ───────────────────────────────────────────
export const ITEM_STATUS_OPTIONS = [
  {
    value: "available",
    label: "Available",
    icon: <PackageOpen size={13} style={{ color: "#3b82f6" }} />,
  },
  {
    value: "reserved",
    label: "Reserved",
    icon: <Clock3 size={13} style={{ color: "#eab308" }} />,
  },
  {
    value: "purchased",
    label: "Purchased",
    icon: <PackageCheck size={13} style={{ color: "#22c55e" }} />,
  },
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
  {
    value: "3",
    label: "High",
    icon: <PriorityBars count={3} color="#ef4444" />,
  },
  {
    value: "2",
    label: "Medium",
    icon: <PriorityBars count={2} color="#eab308" />,
  },
  {
    value: "1",
    label: "Low",
    icon: <PriorityBars count={1} color="#22c55e" />,
  },
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

// ─── Discover Sort ─────────────────────────────────────────
export const DISCOVER_SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "owner-asc", label: "Owner A → Z" },
  { value: "owner-desc", label: "Owner Z → A" },
  { value: "price-high", label: "Highest price" },
  { value: "price-low", label: "Lowest price" },
  { value: "priority-high", label: "Highest priority" },
  { value: "priority-low", label: "Lowest priority" },
];
