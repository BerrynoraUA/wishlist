import { supabaseBrowser } from "@/lib/supabase-browser";
import { logout, loginWithGoogle, loginWithApple, loginWithFacebook } from "@/api/login";
import { getKnownAccount, removeKnownAccount, upsertKnownAccount } from "@/lib/known-accounts";
import type { KnownAccount, KnownAccountProvider } from "@/types/known-accounts";
import {
  ACCENT_COOKIE_NAME,
  THEME_COOKIE_NAME,
  applyThemeAndAccentSynchronously,
  parseAccentCookie,
  parseThemePreference,
  type ThemeAndAccent,
} from "@/lib/theme";

type SwitchHandlers = {
  onRedirect: (href: string) => void;
};

function currentPathWithQuery() {
  if (typeof window === "undefined") return "/home";
  return `${window.location.pathname}${window.location.search}`;
}

function pickPreferredOAuthProvider(
  account: KnownAccount,
): Exclude<KnownAccountProvider, "email" | "unknown"> | null {
  const all: KnownAccountProvider[] = [account.provider, ...(account.providers ?? [])];
  const priority: KnownAccountProvider[] = ["google", "apple", "facebook"];
  for (const candidate of priority) {
    if (all.includes(candidate)) {
      return candidate as Exclude<KnownAccountProvider, "email" | "unknown">;
    }
  }
  return null;
}

async function fallbackToLogin(account: KnownAccount, onRedirect: (href: string) => void) {
  await logout().catch(() => {});

  const oauth = pickPreferredOAuthProvider(account);
  if (oauth === "google") {
    await loginWithGoogle(currentPathWithQuery());
    return;
  }
  if (oauth === "apple") {
    await loginWithApple(currentPathWithQuery());
    return;
  }
  if (oauth === "facebook") {
    await loginWithFacebook(currentPathWithQuery());
    return;
  }

  const params = new URLSearchParams();
  if (account.email) params.set("email", account.email);
  const query = params.toString();
  onRedirect(`/login${query ? `?${query}` : ""}`);
}

async function trySetSession(account: KnownAccount) {
  if (!account.refreshToken || !account.accessToken) return null;
  try {
    const { data, error } = await supabaseBrowser.auth.setSession({
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
    const { data, error } = await supabaseBrowser.auth.refreshSession({
      refresh_token: account.refreshToken,
    });
    if (error || !data.session) return null;
    return data.session;
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return null;
}

function currentAppearance(): ThemeAndAccent {
  return {
    theme: parseThemePreference(readCookie(THEME_COOKIE_NAME)) ?? "system",
    accent: parseAccentCookie(readCookie(ACCENT_COOKIE_NAME)),
  };
}

function knownAccountAppearance(
  account: Pick<KnownAccount, "defaultAccent" | "themePreference"> | undefined,
  fallback: ThemeAndAccent,
): ThemeAndAccent {
  return {
    theme: parseThemePreference(account?.themePreference) ?? fallback.theme,
    accent:
      typeof account?.defaultAccent === "number" &&
      account.defaultAccent >= 0 &&
      account.defaultAccent <= 4
        ? account.defaultAccent
        : fallback.accent,
  };
}

export async function switchAccount(account: KnownAccount, { onRedirect }: SwitchHandlers) {
  const previousAppearance = currentAppearance();
  const targetAppearance = knownAccountAppearance(account, previousAppearance);
  applyThemeAndAccentSynchronously(targetAppearance);

  const session = (await trySetSession(account)) ?? (await tryRefreshSession(account));

  if (!session) {
    applyThemeAndAccentSynchronously(previousAppearance);
    removeKnownAccount(account.userId);
    await fallbackToLogin(account, onRedirect);
    return;
  }

  const storedAccount = getKnownAccount(session.user.id);
  const confirmedAppearance = knownAccountAppearance(storedAccount ?? undefined, targetAppearance);
  applyThemeAndAccentSynchronously(confirmedAppearance);

  upsertKnownAccount({
    userId: session.user.id,
    email: session.user.email ?? account.email,
    provider: account.provider,
    lastUsedAt: Date.now(),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    defaultAccent: confirmedAppearance.accent,
    themePreference: confirmedAppearance.theme,
  });

  if (typeof window !== "undefined") {
    window.location.assign("/home");
  } else {
    onRedirect("/home");
  }
}
