import { loginWithGoogle } from "@/api/login";
import { deactivateCurrentPushToken } from "@/api/notifications";
import { getKnownAccount, removeKnownAccount, upsertKnownAccount } from "@/lib/known-accounts";
import {
  applyNativeThemeSettings,
  readCachedNativeThemeSettings,
  type CachedNativeThemeSettings,
} from "@/lib/theme";
import { supabase } from "@wishlist/backend/supabase/native";
import type { KnownAccount } from "@wishlist/backend/types/known-accounts";
import type { ThemePreference } from "@wishlist/backend/types/settings";
import { WishlistAccent } from "@wishlist/backend/types/wishlist";
import * as LocalAuthentication from "expo-local-authentication";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function isWishlistAccent(value: unknown): value is WishlistAccent {
  return typeof value === "number" && value >= 0 && value <= 4;
}

function getKnownAccountThemeSettings(account: KnownAccount): CachedNativeThemeSettings | null {
  if (!isWishlistAccent(account.defaultAccent)) return null;

  return {
    theme: isThemePreference(account.themePreference) ? account.themePreference : "system",
    default_accent: account.defaultAccent,
  };
}

async function readStoredThemeSettings(account: KnownAccount) {
  return (
    (await readCachedNativeThemeSettings(account.userId)) ?? getKnownAccountThemeSettings(account)
  );
}

async function tryRefreshSession(account: KnownAccount) {
  if (!account.refreshToken) return null;
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: account.refreshToken,
    });
    if (error || !data.session) return null;
    return data.session;
  } catch {
    return null;
  }
}

async function authenticateAccountSwitch() {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  if (!hasHardware || !isEnrolled) return;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Confirm account switch",
    cancelLabel: "Cancel",
    fallbackLabel: "Use device passcode",
    disableDeviceFallback: false,
  });
  if (!result.success) throw new Error("Account switch cancelled.");
}

export async function switchAccount(account: KnownAccount) {
  await authenticateAccountSwitch();
  const storedTargetAccount = await getKnownAccount(account.userId);
  if (!storedTargetAccount) throw new Error("Saved account credentials are unavailable.");

  const targetThemeSettings = await readStoredThemeSettings(storedTargetAccount).catch(() =>
    getKnownAccountThemeSettings(storedTargetAccount),
  );
  if (targetThemeSettings) {
    applyNativeThemeSettings(targetThemeSettings);
  }

  const session = await tryRefreshSession(storedTargetAccount);

  if (!session) {
    await removeKnownAccount(storedTargetAccount.userId);
    await deactivateCurrentPushToken().catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    await loginWithGoogle();
    return;
  }

  const storedAccount = await getKnownAccount(session.user.id);
  const storedThemeSettings = storedAccount
    ? await readStoredThemeSettings(storedAccount).catch(() =>
        getKnownAccountThemeSettings(storedAccount),
      )
    : targetThemeSettings;
  if (storedThemeSettings) {
    applyNativeThemeSettings(storedThemeSettings);
  }

  await upsertKnownAccount({
    userId: session.user.id,
    email: session.user.email ?? storedTargetAccount.email,
    displayName: storedAccount?.displayName ?? storedTargetAccount.displayName ?? null,
    avatarUrl: storedAccount?.avatarUrl ?? storedTargetAccount.avatarUrl ?? null,
    provider: "google",
    providers: ["google"],
    lastUsedAt: Date.now(),
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    defaultAccent: storedAccount?.defaultAccent ?? storedTargetAccount.defaultAccent ?? null,
    themePreference:
      storedThemeSettings?.theme ??
      storedAccount?.themePreference ??
      storedTargetAccount.themePreference ??
      null,
  });
}
