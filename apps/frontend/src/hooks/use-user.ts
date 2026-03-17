import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { getMyStatistics } from "@/api/user";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const statisticsKeys = {
  all: ['statistics'] as const,
  my: () => [...statisticsKeys.all, 'my'] as const,
};

export function useMyStatistics() {
  return useQuery({
    queryKey: statisticsKeys.my(),
    queryFn: () => getMyStatistics(),
  });
}

const authKeys = {
  user: ['auth', 'user'] as const,
};

async function fetchCurrentUser(): Promise<User | null> {
  const { data, error } = await supabaseBrowser.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: fetchCurrentUser,
  });
}

// Fetches current user once and caches via React Query to avoid repeated Supabase calls
export function useCurrentUserId() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: fetchCurrentUser,
    select: (user) => user?.id ?? "",
  });
}