import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { getMyStatistics } from "@/api/user";
import { supabase } from "@/lib/supabase";

export const statisticsKeys = {
  all: ["statistics"] as const,
  my: () => [...statisticsKeys.all, "my"] as const,
};

export function useMyStatistics() {
  return useQuery({
    queryKey: statisticsKeys.my(),
    queryFn: () => getMyStatistics(),
  });
}

const authKeys = {
  user: ["auth", "user"] as const,
};

async function fetchCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: fetchCurrentUser,
  });
}

export function useCurrentUserId() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: fetchCurrentUser,
    select: (user) => user?.id ?? "",
  });
}
