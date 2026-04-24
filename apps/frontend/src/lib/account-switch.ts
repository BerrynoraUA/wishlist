import { supabaseBrowser } from "@/lib/supabase-browser";
import { logout, loginWithGoogle, loginWithApple, loginWithFacebook } from "@/api/login";
import { getKnownAccount, removeKnownAccount, upsertKnownAccount } from "@/lib/known-accounts";
import type { KnownAccount, KnownAccountProvider } from "@/types/known-accounts";
import {
  RESOLVED_THEME_COOKIE_NAME,
  buildAccentCookie,
  getAccentInlineStyles,
  parseResolvedTheme,
  type ResolvedTheme,
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

function currentResolvedTheme(): ResolvedTheme {
  const fromCookie = parseResolvedTheme(readCookie(RESOLVED_THEME_COOKIE_NAME));
  if (fromCookie) return fromCookie;
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyAccentSynchronously(accent: number) {
  if (typeof document === "undefined") return;
  document.cookie = buildAccentCookie(accent);
  const resolvedTheme = currentResolvedTheme();
  const styles = getAccentInlineStyles(accent, resolvedTheme);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(styles)) {
    root.style.setProperty(name, value);
  }
}

export async function switchAccount(account: KnownAccount, { onRedirect }: SwitchHandlers) {
  const session = (await trySetSession(account)) ?? (await tryRefreshSession(account));

  if (!session) {
    removeKnownAccount(account.userId);
    await fallbackToLogin(account, onRedirect);
    return;
  }

  // Apply the target account's accent synchronously so the upcoming full
  // reload paints with the correct brand color from the first frame
  // (before the new user's settings query resolves).
  const storedAccent = getKnownAccount(session.user.id)?.defaultAccent;
  const targetAccent =
    typeof storedAccent === "number" && storedAccent >= 0 && storedAccent <= 4 ? storedAccent : 0;
  applyAccentSynchronously(targetAccent);

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
