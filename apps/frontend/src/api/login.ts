import { supabaseBrowser } from "@/lib/supabase-browser";

const AUTH_REDIRECT_COOKIE = "bn_auth_redirect_to";

function persistAuthRedirect(target?: string) {
  const safeTarget = target?.startsWith("/") ? target : "/home";
  document.cookie = `${AUTH_REDIRECT_COOKIE}=${encodeURIComponent(safeTarget)}; Path=/; Max-Age=600; SameSite=Lax`;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabaseBrowser.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
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
