import type { Database } from "../db-types";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

export type WishlistDatabase = Database;
export type WishlistSupabaseClient = SupabaseClient<Database>;
export type SupabaseSession = Session;
export type SupabaseUser = User;
