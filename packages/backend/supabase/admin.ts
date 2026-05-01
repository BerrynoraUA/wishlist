import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db-types";
import type { WishlistSupabaseClient } from "./types";
import { getSupabaseServiceEnv } from "./shared";

let adminClient: WishlistSupabaseClient | null = null;

export function createClientWithKey(
  apiKey: string,
  options?: Parameters<typeof createClient<Database>>[2],
): WishlistSupabaseClient {
  const { url, key } = getSupabaseServiceEnv(apiKey);
  return createClient<Database>(url, key, options);
}

export function createAdminClient(serviceKey?: string): WishlistSupabaseClient {
  if (!serviceKey && adminClient) return adminClient;

  const { url, key } = getSupabaseServiceEnv(serviceKey);
  const client = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!serviceKey) {
    adminClient = client;
  }

  return client;
}

export const getSupabaseAdmin = createAdminClient;
