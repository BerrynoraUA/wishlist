import { createMMKV } from "react-native-mmkv";

/**
 * On-device, synchronous key-value store for local app preferences.
 *
 * Backed by MMKV. Use this for lightweight UI preferences that should persist
 * across launches but do not need to sync to the server (those belong in
 * `user_settings` via `useSettings`).
 */
export const preferencesStorage = createMMKV({ id: "wishlist.preferences" });

export const PREFERENCE_KEYS = {
  /** When `true`, the floating back button on detail screens is hidden. */
  hideBackButton: "preferences.hideBackButton",
} as const;
