import { supabaseBrowser } from "@/lib/supabase-browser";
import { getSettings } from "@/api/settings";
import {
  DEFAULT_ACCENT,
  DEFAULT_THEME_PREFERENCE,
  applyThemeAndAccentSynchronously,
} from "@/lib/theme";

const AUTH_REDIRECT_COOKIE = "bn_auth_redirect_to";

function persistAuthRedirect(target?: string) {
  const safeTarget = target?.startsWith("/") ? target : "/home";
  document.cookie = `${AUTH_REDIRECT_COOKIE}=${encodeURIComponent(safeTarget)}; Path=/; Max-Age=600; SameSite=Lax`;
}

function applyDefaultAppearanceForNewAccount() {
  applyThemeAndAccentSynchronously({
    theme: DEFAULT_THEME_PREFERENCE,
    accent: DEFAULT_ACCENT,
  });
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

    applyThemeAndAccentSynchronously({
      theme: settings.theme ?? DEFAULT_THEME_PREFERENCE,
      accent,
    });
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
  applyDefaultAppearanceForNewAccount();
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
  applyDefaultAppearanceForNewAccount();
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
  applyDefaultAppearanceForNewAccount();
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
