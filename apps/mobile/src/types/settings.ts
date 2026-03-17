import { WishlistAccent } from "./wishlist";

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
  default_wishlist_color: WishlistColorIndex;
}

export type ThemePreference = "light" | "dark" | "system";

export type UpdateProfilePayload = Partial<
  Pick<UserProfile, "display_name" | "nickname" | "bio" | "avatar_url">
>;

export type UpdateSettingsPayload = Partial<Omit<UserSettings, "user_id">>;

export const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  notify_friend_requests: true,
  notify_reservations: true,
  notify_sale_alerts: true,
  email_digest: false,
  theme: "light",
  default_accent: WishlistAccent.Pink,
  default_wishlist_color: 0,
};
