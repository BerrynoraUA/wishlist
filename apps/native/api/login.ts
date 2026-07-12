import { supabase } from "@wishlist/backend/supabase/native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { getOAuthAuthorizationCode } from "@/lib/oauth-callback";

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = "facebook" | "google";

// iOS can return the callback through openAuthSessionAsync while Android cold starts
// deliver it to OAuthCallbackScreen, so the same authorization code may arrive twice.
let pendingCodeExchange: { code: string; promise: Promise<void> } | null = null;
let lastCompletedCode: string | null = null;

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return String((error as { code?: unknown }).code ?? "");
}

export function getOAuthRedirectUrl(provider: OAuthProvider) {
  return Linking.createURL(`${provider}-auth`);
}

export async function completeOAuthSessionFromUrl(url: string, redirectTo: string): Promise<void> {
  const code = getOAuthAuthorizationCode(url, redirectTo);
  if (lastCompletedCode === code) return;

  if (pendingCodeExchange) {
    if (pendingCodeExchange.code !== code) {
      throw new Error("Another OAuth sign-in is already being completed.");
    }

    return pendingCodeExchange.promise;
  }

  const promise = supabase.auth
    .exchangeCodeForSession(code)
    .then(({ error }) => {
      if (error) throw error;
      lastCompletedCode = code;
    })
    .finally(() => {
      pendingCodeExchange = null;
    });

  pendingCodeExchange = { code, promise };

  return promise;
}

function getAppleFullName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) {
    return null;
  }

  return [fullName.givenName, fullName.middleName, fullName.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function updateAppleUserMetadata(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
) {
  const displayName = getAppleFullName(fullName);

  if (!displayName) {
    return;
  }

  await supabase.auth.updateUser({
    data: {
      full_name: displayName,
      given_name: fullName?.givenName,
      family_name: fullName?.familyName,
    },
  });
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function registerWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (!data.session) {
    await loginWithEmail(email, password);
  }
}

async function loginWithOAuth(provider: OAuthProvider, queryParams?: Record<string, string>) {
  const redirectTo = getOAuthRedirectUrl(provider);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data.url) {
    throw new Error("OAuth sign-in did not return an authorization URL.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: false,
  });

  if (result.type !== "success") {
    throw new Error("OAuth sign-in was cancelled.");
  }

  await completeOAuthSessionFromUrl(result.url, redirectTo);
}

export async function loginWithGoogle(): Promise<void> {
  await loginWithOAuth("google", {
    prompt: "select_account consent",
  });
}

export async function loginWithFacebook(): Promise<void> {
  await loginWithOAuth("facebook");
}

export async function loginWithApple(): Promise<void> {
  if (process.env.EXPO_OS !== "ios") {
    throw new Error("Apple sign-in is only available on iOS.");
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple sign-in did not return an identity token.");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error) throw error;

    await updateAppleUserMetadata(credential.fullName);
  } catch (error) {
    if (getErrorCode(error) === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple sign-in was cancelled.");
    }

    throw error;
  }
}
