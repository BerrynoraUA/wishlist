import { isCachedNativeThemeSettings, type CachedNativeThemeSettings } from "@/lib/theme";
import { preferencesStorage } from "@/lib/storage";

/**
 * Values the app needs during its very first render, before any async work has had a
 * chance to resolve.
 *
 * MMKV reads are synchronous, which is the whole point: the equivalent SecureStore cache
 * in `lib/theme.ts` can only be read from an effect, so the first paint ends up racing it
 * against the `useSettings()` network query and shows a spinner until one of them lands.
 * Reading from here instead means `AuthenticatedThemeGate` is ready on its first render.
 *
 * Only put things here that are (a) needed before the first frame and (b) not secret —
 * this shares the unencrypted preferences store. Session tokens stay in SecureStore.
 */

export const BOOT_KEYS = {
  /** Last account to reach a resolved session, so pre-auth UI can pick a theme. */
  lastUserId: "boot.lastUserId",
  /** Per-user mirror of the theme half of `user_settings`; the server stays authoritative. */
  themeSettings: (userId: string) => `boot.themeSettings.${userId}`,
} as const;

export function readBootThemeSettings(
  userId: string | null | undefined,
): CachedNativeThemeSettings | null {
  if (!userId) return null;

  const raw = preferencesStorage.getString(BOOT_KEYS.themeSettings(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isCachedNativeThemeSettings(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeBootThemeSettings(userId: string, settings: CachedNativeThemeSettings) {
  preferencesStorage.set(BOOT_KEYS.themeSettings(userId), JSON.stringify(settings));
}

export function readBootLastUserId(): string | null {
  return preferencesStorage.getString(BOOT_KEYS.lastUserId) ?? null;
}

export function writeBootLastUserId(userId: string | null) {
  if (!userId) {
    preferencesStorage.remove(BOOT_KEYS.lastUserId);
    return;
  }

  preferencesStorage.set(BOOT_KEYS.lastUserId, userId);
}
