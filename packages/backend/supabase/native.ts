import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { createClient, type Session } from "@supabase/supabase-js";
import type { Database } from "../db-types";
import type { WishlistSupabaseClient } from "./types";
import { getSupabasePublicEnv } from "./shared";
import { createShowcaseClient } from "./showcase/client";

function toSecureStoreKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(toSecureStoreKey(key)),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(toSecureStoreKey(key), value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(toSecureStoreKey(key)),
};

// Same value supabase-js derives by default; spelled out so `readStoredNativeSession` reads
// exactly the entry the client writes.
function getAuthStorageKey(url: string) {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

export function createNativeClient(): WishlistSupabaseClient {
  const { url, key } = getSupabasePublicEnv();
  return createClient<Database>(url, key, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      storageKey: getAuthStorageKey(url),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}

// App-store captures run against fixtures instead of a project, so the harness needs
// no Supabase credentials and no local stack. See `./showcase/client.ts`.
export const supabase =
  process.env.EXPO_PUBLIC_SHOWCASE === "1" ? createShowcaseClient() : createNativeClient();

/**
 * The session supabase-js last persisted, as-is: not validated, not refreshed.
 *
 * Offline with an expired access token, supabase-js keeps this entry (the refresh failed for
 * network reasons) but reports no session, so the app uses it to stay signed in until it can
 * refresh. A real sign-out or a rejected refresh token removes it.
 */
export async function readStoredNativeSession(): Promise<Session | null> {
  if (process.env.EXPO_PUBLIC_SHOWCASE === "1") return null;

  const raw = await ExpoSecureStoreAdapter.getItem(getAuthStorageKey(getSupabasePublicEnv().url));
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Session;
    return session.user?.id && session.refresh_token ? session : null;
  } catch {
    return null;
  }
}
