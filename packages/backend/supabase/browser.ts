import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { Database } from "../db-types";
import type { WishlistSupabaseClient } from "./types";
import { getSupabasePublicEnv } from "./shared";

let browserClient: WishlistSupabaseClient | null = null;

export function createBrowserClient(): WishlistSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { url, key } = getSupabasePublicEnv();
  browserClient = createSupabaseBrowserClient<Database>(url, key);
  return browserClient;
}

export const supabaseBrowser = new Proxy({} as WishlistSupabaseClient, {
  get(_target, prop, receiver) {
    const client = createBrowserClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
