import { SUPPORTED_CURRENCIES } from "../lib/currencies";
import { PRIORITY_IDS } from "../lib/priorities";
import { WishlistAccent } from "./wishlist";

export { SUPPORTED_CURRENCIES };

export type WishlistColorIndex = 0 | 1 | 2 | 3 | 4;

export interface UserProfile {
  id: string;
  display_name: string;
  nickname: string | null;
  bio: string | null;
  height: number | null;
  shoe_size: number | null;
  avatar_url: string | null;
  userGuideStep: number | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  notify_friend_requests: boolean;
  notify_reservations: boolean;
  notify_secret_santa: boolean;
  notify_new_wishlists: boolean;
  notify_upcoming_events: boolean;
  notify_group_added: boolean;
  notify_wishlist_access: boolean;
  notify_reserved_item_updates: boolean;
  email_digest: boolean;
  theme: ThemePreference;
  default_accent: WishlistAccent;
  default_wishlist_color: WishlistColorIndex;
  display_currency: string;
  selected_priorities: string[];
  /**
   * Pro-only opt-in. When true, the owner of a wishlist sees whether their own
   * items have been reserved or bought — off by default to keep the surprise.
   */
  show_own_reservations: boolean;
  /**
   * The user's chosen UI language (GT locale code). Persisted so the server/other clients
   * know which language to render this user's notifications in. `null` until first set.
   */
  preferred_locale: string | null;
}

export type ThemePreference = "light" | "dark" | "system";

export type UpdateProfilePayload = Partial<
  Pick<
    UserProfile,
    "display_name" | "nickname" | "bio" | "height" | "shoe_size" | "avatar_url" | "userGuideStep"
  >
>;

export type UpdateSettingsPayload = Partial<Omit<UserSettings, "user_id">>;

export type SettingsTab = "profile" | "account" | "notifications" | "appearance";

export const SETTINGS_TAB_ORDER: readonly SettingsTab[] = [
  "profile",
  "account",
  "notifications",
  "appearance",
] as const;

export const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  notify_friend_requests: true,
  notify_reservations: true,
  notify_secret_santa: true,
  notify_new_wishlists: true,
  notify_upcoming_events: true,
  notify_group_added: true,
  notify_wishlist_access: true,
  notify_reserved_item_updates: true,
  email_digest: false,
  theme: "system",
  default_accent: WishlistAccent.Pink,
  default_wishlist_color: 0,
  display_currency: "USD",
  selected_priorities: [PRIORITY_IDS.LOW, PRIORITY_IDS.MEDIUM, PRIORITY_IDS.HIGH],
  show_own_reservations: false,
  preferred_locale: null,
};
