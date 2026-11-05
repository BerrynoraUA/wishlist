import type { SupabaseSession, SupabaseUser } from "@wishlist/backend/supabase";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { UserStatistics } from "./types/user";

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  const { data, error } = await supabaseBrowser.auth.getUser();

  // Being signed out is a normal state, not a failure.
  if (isAuthSessionMissingError(error)) return null;
  if (error) throw error;

  return data.user ?? null;
}

export async function getCurrentSession(): Promise<SupabaseSession | null> {
  const { data, error } = await supabaseBrowser.auth.getSession();

  if (error) throw error;

  return data.session ?? null;
}

export async function getMyStatistics(): Promise<UserStatistics> {
  const { data, error } = await supabaseBrowser.rpc("get_user_stats");

  if (error) throw error;

  return data[0];
}
