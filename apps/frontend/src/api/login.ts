import { supabaseBrowser } from "@/lib/supabase-browser";
import { getSettings } from "@/api/settings";
import {
  RESOLVED_THEME_COOKIE_NAME,
  THEME_COOKIE_NAME,
  THEME_COOKIE_MAX_AGE,
  buildAccentCookie,
  getAccentInlineStyles,
  parseResolvedTheme,
  resolveThemePreference,
} from "@/lib/theme";

const AUTH_REDIRECT_COOKIE = "bn_auth_redirect_to";

function persistAuthRedirect(target?: string) {
  const safeTarget = target?.startsWith("/") ? target : "/home";
  document.cookie = `${AUTH_REDIRECT_COOKIE}=${encodeURIComponent(safeTarget)}; Path=/; Max-Age=600; SameSite=Lax`;
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

async function primeThemeAndAccentFromSettings(): Promise<void> {
  try {
    const settings = await getSettings();
    const accent =
      typeof settings.default_accent === "number" &&
      settings.default_accent >= 0 &&
      settings.default_accent <= 4
        ? settings.default_accent
        : 0;

    const theme = settings.theme ?? "system";
    const systemResolved =
      parseResolvedTheme(readCookie(RESOLVED_THEME_COOKIE_NAME)) ??
      (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    const resolvedTheme =
      theme === "light" || theme === "dark" ? theme : resolveThemePreference(theme, systemResolved);

    if (typeof document !== "undefined") {
      document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
      document.cookie = `${RESOLVED_THEME_COOKIE_NAME}=${resolvedTheme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
      document.cookie = buildAccentCookie(accent);
      const root = document.documentElement;
      root.setAttribute("data-theme", resolvedTheme);
      root.style.colorScheme = resolvedTheme;
      const styles = getAccentInlineStyles(accent, resolvedTheme);
      for (const [name, value] of Object.entries(styles)) {
        root.style.setProperty(name, value);
      }
    }
  } catch {
    // Ignore — SSR/user settings unavailable will fall back to existing cookie.
  }
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  await primeThemeAndAccentFromSettings();
}

export async function registerWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabaseBrowser.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (!data.session) {
    await loginWithEmail(email, password);
    return;
  }

  await primeThemeAndAccentFromSettings();
}

export async function logout(): Promise<void> {
  const { error } = await supabaseBrowser.auth.signOut();

  if (error) throw error;
}

export async function loginWithGoogle(redirectTo?: string): Promise<void> {
  persistAuthRedirect(redirectTo);
  const callback = `${window.location.origin}/auth/callback`;

  const { error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
}

export async function loginWithApple(redirectTo?: string): Promise<void> {
  persistAuthRedirect(redirectTo);
  const callback = `${window.location.origin}/auth/callback`;

  const { error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: callback,
    },
  });

  if (error) throw error;
}

export async function loginWithFacebook(redirectTo?: string): Promise<void> {
  persistAuthRedirect(redirectTo);
  const callback = `${window.location.origin}/auth/callback`;

  const { error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: callback,
    },
  });

  if (error) throw error;
}
