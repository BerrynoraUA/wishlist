import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionStatus,
  syncSubscription,
  openPaddleCheckout,
} from "@/api/subscription";
import { SubscriptionPlan, BillingInterval } from "@/types/subscription";

// Query Keys
export const subscriptionKeys = {
  all: ["subscription"] as const,
  status: () => [...subscriptionKeys.all, "status"] as const,
};

// Queries
export function useSubscription() {
  const query = useQuery({
    queryKey: subscriptionKeys.status(),
    queryFn: getSubscriptionStatus,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    plan: query.data?.plan ?? SubscriptionPlan.Free,
    isPro:
      query.data?.plan === SubscriptionPlan.Pro &&
      query.data?.isActive === true,
    expiresAt: query.data?.expiresAt ?? null,
  };
}

// Mutations
export function useCheckout() {
  return {
    checkout: (interval: BillingInterval) => {
      openPaddleCheckout(interval).catch(console.error);
    },
  };
}

export function useSyncSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.status(),
      });
    },
  });
}
