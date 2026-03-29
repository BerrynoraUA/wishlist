import { supabase } from "@/lib/supabase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

function configureGoogleSignin(): void {
  if (!googleWebClientId) {
    throw new Error(
      "Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. Set it to your Google Web OAuth client ID before using Google sign-in."
    );
  }

  GoogleSignin.configure({
    webClientId: googleWebClientId,
  });
}

function getGoogleSignInErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = String((error as { code?: unknown }).code ?? "");

  switch (code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return "Google sign-in was cancelled.";
    case statusCodes.IN_PROGRESS:
      return "Google sign-in is already in progress.";
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return "Google Play Services are unavailable or outdated on this device.";
    case "10":
    case "DEVELOPER_ERROR":
      return `Google Sign-In is misconfigured for Android. Add or update an Android OAuth client in Google Cloud Console, and keep EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID set to your Web OAuth client ID.`;
    default:
      return null;
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (!data.session) {
    await loginWithEmail(email, password);
  }
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function loginWithGoogle(): Promise<void> {
  configureGoogleSignin();

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error("No ID token returned from Google Sign-In");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.data.idToken,
    });

    if (error) throw error;
  } catch (error) {
    const friendlyMessage = getGoogleSignInErrorMessage(error);

    if (friendlyMessage) {
      throw new Error(friendlyMessage);
    }

    throw error;
  }
}
