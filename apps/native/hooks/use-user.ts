import { useAuth } from "@/providers/auth-provider";

export function useCurrentUserId() {
  const { user, isLoading } = useAuth();

  return {
    data: user?.id ?? "",
    isLoading,
  };
}
