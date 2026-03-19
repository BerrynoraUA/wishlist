import { WishlistAccent } from "@/types/wishlist";

export type WishlistColorIndex = 0 | 1 | 2 | 3 | 4;

export interface UserProfile {
  id: string;
  display_name: string;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  notify_friend_requests: boolean;
  notify_reservations: boolean;
  notify_sale_alerts: boolean;
  email_digest: boolean;
  theme: ThemePreference;
  default_accent: WishlistAccent;
  // 0-based index in UI order: pink, peach, blue, lavender, mint
  default_wishlist_color: WishlistColorIndex;
}

export type ThemePreference = "light" | "dark" | "system";

export type UpdateProfilePayload = Partial<
  Pick<UserProfile, "display_name" | "nickname" | "bio" | "avatar_url">
>;

export type UpdateSettingsPayload = Partial<Omit<UserSettings, "user_id">>;

export type SettingsTab =
  | "profile"
  | "account"
  | "notifications"
  | "appearance";

export const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
];

export const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  notify_friend_requests: true,
  notify_reservations: true,
  notify_sale_alerts: true,
  email_digest: false,
  theme: "system",
  default_accent: WishlistAccent.Pink,
  default_wishlist_color: 0,
};
