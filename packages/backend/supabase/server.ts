import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { Database } from "../db-types";
import { getSupabasePublicEnv } from "./shared";

export type ServerCookies = NonNullable<
  Parameters<typeof createSupabaseServerClient<Database>>[2]
>["cookies"];

export function createServerClient(cookies: ServerCookies) {
  const { url, key } = getSupabasePublicEnv();
  return createSupabaseServerClient<Database>(url, key, { cookies });
}
