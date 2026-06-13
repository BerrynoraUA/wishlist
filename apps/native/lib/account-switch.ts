import { loginWithGoogle } from "@/api/login";
import { getKnownAccount, removeKnownAccount, upsertKnownAccount } from "@/lib/known-accounts";
import { getNativeThemeNameForPreference } from "@/lib/theme";
import { supabase } from "@wishlist/backend/supabase/native";
import type { KnownAccount } from "@wishlist/backend/types/known-accounts";
import { Appearance } from "react-native";
import { Uniwind } from "uniwind";

function applyStoredAccent(defaultAccent: number | null | undefined) {
  if (typeof defaultAccent !== "number" || defaultAccent < 0 || defaultAccent > 4) return;
  Uniwind.setTheme(
    getNativeThemeNameForPreference("system", defaultAccent, Appearance.getColorScheme()),
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
  const session = (await trySetSession(account)) ?? (await tryRefreshSession(account));

  if (!session) {
    await removeKnownAccount(account.userId);
    await supabase.auth.signOut().catch(() => {});
    await loginWithGoogle();
    return;
  }

  const storedAccount = await getKnownAccount(session.user.id);
  applyStoredAccent(storedAccount?.defaultAccent ?? account.defaultAccent);

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
  });
}
