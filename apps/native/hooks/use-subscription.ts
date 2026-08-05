import { getSubscriptionStatus, syncSubscription } from "@/api/subscription";
import { useAuth } from "@/providers/auth-provider";
import { SubscriptionPlan } from "@wishlist/backend/types/subscription";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const subscriptionKeys = {
  all: ["subscription"] as const,
  status: (userId: string | null | undefined) =>
    [...subscriptionKeys.all, "status", userId ?? "anonymous"] as const,
};

export function useSubscriptionStatus({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: subscriptionKeys.status(user?.id),
    queryFn: getSubscriptionStatus,
    enabled: enabled && Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    plan: query.data?.plan ?? SubscriptionPlan.Free,
    isPro: query.data?.plan === SubscriptionPlan.Pro && query.data?.isActive === true,
    expiresAt: query.data?.expiresAt ?? null,
    paddleSubscriptionId: query.data?.paddleSubscriptionId ?? null,
  };
}

export const useSubscription = useSubscriptionStatus;

export function useSyncSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncSubscription,
    onSuccess: (status) => {
      queryClient.setQueryData(subscriptionKeys.status(user?.id), status);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(user?.id) });
    },
  });
}
