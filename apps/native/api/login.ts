import { supabase } from "@wishlist/backend/supabase/native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return String((error as { code?: unknown }).code ?? "");
}

function extractSessionParamsFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(
    parsedUrl.hash ? parsedUrl.hash.substring(1) : parsedUrl.search.substring(1),
  );

  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
  };
}

export async function completeOAuthSessionFromUrl(url: string): Promise<void> {
  const { accessToken, refreshToken } = extractSessionParamsFromUrl(url);

  if (!accessToken || !refreshToken) {
    throw new Error("OAuth callback did not return a Supabase session.");
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) throw error;
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

export async function loginWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL("google-auth");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account consent",
      },
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data.url) {
    throw new Error("Google sign-in did not return an authorization URL.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled.");
  }

  await completeOAuthSessionFromUrl(result.url);
}

export async function loginWithFacebook(): Promise<void> {
  const redirectTo = Linking.createURL("facebook-auth");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data.url) {
    throw new Error("Facebook sign-in did not return an authorization URL.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type !== "success") {
    throw new Error("Facebook sign-in was cancelled.");
  }

  await completeOAuthSessionFromUrl(result.url);
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
