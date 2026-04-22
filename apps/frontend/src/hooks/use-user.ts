import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, getMyStatistics } from "@/api/user";

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

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: getCurrentUser,
  });
}

// Fetches current user once and caches via React Query to avoid repeated Supabase calls
export function useCurrentUserId() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: getCurrentUser,
    select: (user) => user?.id ?? "",
  });
}
