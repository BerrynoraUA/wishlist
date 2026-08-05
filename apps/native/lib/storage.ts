import { createMMKV } from "react-native-mmkv";
import { getSupabaseStoragePath } from "@/lib/storage-url";
import { supabase } from "@wishlist/backend/supabase/native";

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
  /** When `true`, the Feature Ideas intro card is hidden. */
  featureIdeasIntroDismissed: "preferences.featureIdeasIntroDismissed",
  /**
   * Per-user mirror of `profile.userGuideStep` reaching the final step. Read
   * synchronously at mount so the user guide can skip initialising entirely; the
   * profile stays the source of truth.
   */
  userGuideCompleted: (userId: string) => `preferences.userGuideCompleted.${userId}`,
} as const;

export async function removeOwnedStorageImage(bucket: string, imageUrl: string | null | undefined) {
  const path = getSupabaseStoragePath(imageUrl, bucket);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
