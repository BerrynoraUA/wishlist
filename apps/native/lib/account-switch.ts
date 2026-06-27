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

async function trySetSession(account: KnownAccount) {
  if (!account.refreshToken || !account.accessToken) return null;
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });
    if (error || !data.session) return null;
    return data.session;
  } catch {
    return null;
  }
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

export async function switchAccount(account: KnownAccount) {
  const targetThemeSettings = await readStoredThemeSettings(account).catch(() =>
    getKnownAccountThemeSettings(account),
  );
  if (targetThemeSettings) {
    applyNativeThemeSettings(targetThemeSettings);
  }

  const session = (await trySetSession(account)) ?? (await tryRefreshSession(account));

  if (!session) {
    await removeKnownAccount(account.userId);
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
    email: session.user.email ?? account.email,
    displayName: storedAccount?.displayName ?? account.displayName ?? null,
    avatarUrl: storedAccount?.avatarUrl ?? account.avatarUrl ?? null,
    provider: "google",
    providers: ["google"],
    lastUsedAt: Date.now(),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    defaultAccent: storedAccount?.defaultAccent ?? account.defaultAccent ?? null,
    themePreference:
      storedThemeSettings?.theme ??
      storedAccount?.themePreference ??
      account.themePreference ??
      null,
  });
}
