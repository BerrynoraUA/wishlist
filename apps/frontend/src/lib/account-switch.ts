import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  logout,
  loginWithGoogle,
  loginWithApple,
  loginWithFacebook,
} from "@/api/login";
import { removeKnownAccount, upsertKnownAccount } from "@/lib/known-accounts";
import type {
  KnownAccount,
  KnownAccountProvider,
} from "@/types/known-accounts";

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
  const all: KnownAccountProvider[] = [
    account.provider,
    ...(account.providers ?? []),
  ];
  const priority: KnownAccountProvider[] = ["google", "apple", "facebook"];
  for (const candidate of priority) {
    if (all.includes(candidate)) {
      return candidate as Exclude<KnownAccountProvider, "email" | "unknown">;
    }
  }
  return null;
}

async function fallbackToLogin(
  account: KnownAccount,
  onRedirect: (href: string) => void,
) {
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

export async function switchAccount(
  account: KnownAccount,
  { onRedirect }: SwitchHandlers,
) {
  const session =
    (await trySetSession(account)) ?? (await tryRefreshSession(account));

  if (!session) {
    removeKnownAccount(account.userId);
    await fallbackToLogin(account, onRedirect);
    return;
  }

  upsertKnownAccount({
    userId: session.user.id,
    email: session.user.email ?? account.email,
    provider: account.provider,
    lastUsedAt: Date.now(),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
  });

  if (typeof window !== "undefined") {
    window.location.assign("/home");
  } else {
    onRedirect("/home");
  }
}
