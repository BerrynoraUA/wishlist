import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db-types";
import type { WishlistSupabaseClient } from "./types";
import { getSupabasePublicEnv } from "./shared";

function toSecureStoreKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(toSecureStoreKey(key)),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(toSecureStoreKey(key), value),
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
    },
  });
}

export const supabase = createNativeClient();
