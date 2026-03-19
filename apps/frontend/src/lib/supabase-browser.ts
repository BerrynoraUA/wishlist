import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL) as string | undefined;
  const supabaseAnonKey = (process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public env variables");
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

export const supabaseBrowser = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseBrowser();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
