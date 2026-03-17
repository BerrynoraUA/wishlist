import { supabase } from "@/lib/supabase";
import type { UserStatistics } from "./types/user";

export async function getMyStatistics(): Promise<UserStatistics> {
  const { data, error } = await supabase.rpc("get_user_statistics");

  if (error) throw error;
  return data[0];
}
