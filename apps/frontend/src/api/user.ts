import { supabaseBrowser } from "@/lib/supabase-browser";
import type { UserStatistics } from "./types/user";

export async function getMyStatistics(): Promise<UserStatistics> {
  const { data, error } = await supabaseBrowser.rpc("get_user_statistics");

  if (error) throw error;

  return data[0];
}
