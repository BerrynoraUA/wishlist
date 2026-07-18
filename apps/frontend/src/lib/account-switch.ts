import { supabaseBrowser } from "@/lib/supabase-browser";
import { logout, loginWithGoogle, loginWithApple, loginWithFacebook } from "@/api/login";
import { getKnownAccount, removeKnownAccount, upsertKnownAccount } from "@/lib/known-accounts";
import type { KnownAccount, KnownAccountProvider } from "@/types/known-accounts";
import {
  ACCENT_COOKIE_NAME,
  THEME_COOKIE_NAME,
  buildAccentCookie,
  buildResolvedThemeCookie,
  buildThemeCookie,
  getAccentInlineStyles,
  parseAccentCookie,
  parseThemePreference,
  resolveThemePreference,
  type ResolvedTheme,
} from "@/lib/theme";
import type { ThemePreference } from "@/types/settings";

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

type AccountAppearance = {
  theme: ThemePreference;
  accent: number;
};

const INSTANT_THEME_CLASS = "account-switching-theme";

function currentAppearance(): AccountAppearance {
  return {
    theme: parseThemePreference(readCookie(THEME_COOKIE_NAME)) ?? "system",
    accent: parseAccentCookie(readCookie(ACCENT_COOKIE_NAME)),
  };
}

function knownAccountAppearance(
  account: Pick<KnownAccount, "defaultAccent" | "themePreference"> | undefined,
  fallback: AccountAppearance,
): AccountAppearance {
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

function applyAppearanceSynchronously({ theme, accent }: AccountAppearance) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add(INSTANT_THEME_CLASS);

  const systemTheme: ResolvedTheme =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const resolvedTheme = resolveThemePreference(theme, systemTheme);

  document.cookie = buildThemeCookie(theme);
  document.cookie = buildResolvedThemeCookie(resolvedTheme);
  document.cookie = buildAccentCookie(accent);
  const styles = getAccentInlineStyles(accent, resolvedTheme);
  root.setAttribute("data-theme", resolvedTheme);
  root.style.colorScheme = resolvedTheme;
  for (const [name, value] of Object.entries(styles)) {
    root.style.setProperty(name, value);
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove(INSTANT_THEME_CLASS);
    });
  });
}

export async function switchAccount(account: KnownAccount, { onRedirect }: SwitchHandlers) {
  const previousAppearance = currentAppearance();
  const targetAppearance = knownAccountAppearance(account, previousAppearance);
  applyAppearanceSynchronously(targetAppearance);

  const session = (await trySetSession(account)) ?? (await tryRefreshSession(account));

  if (!session) {
    applyAppearanceSynchronously(previousAppearance);
    removeKnownAccount(account.userId);
    await fallbackToLogin(account, onRedirect);
    return;
  }

  const storedAccount = getKnownAccount(session.user.id);
  const confirmedAppearance = knownAccountAppearance(storedAccount, targetAppearance);
  applyAppearanceSynchronously(confirmedAppearance);

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
