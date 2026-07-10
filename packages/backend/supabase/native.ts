import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { createClient, processLock } from "@supabase/supabase-js";
import type { Database } from "../db-types";
import type { WishlistSupabaseClient } from "./types";
import { getSupabasePublicEnv } from "./shared";

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

export function createNativeClient(): WishlistSupabaseClient {
  const { url, key } = getSupabasePublicEnv();
  return createClient<Database>(url, key, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
    },
  });
}

export const supabase = createNativeClient();
