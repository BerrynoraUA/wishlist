import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionStatus,
  getOfferings,
  syncSubscription,
  redirectToCheckout,
} from "@/api/subscription";
import { SubscriptionPlan, BillingInterval } from "@/types/subscription";

/* ── Query keys ── */
export const subscriptionKeys = {
  all: ["subscription"] as const,
  status: () => [...subscriptionKeys.all, "status"] as const,
  offerings: () => [...subscriptionKeys.all, "offerings"] as const,
};

/* ── Subscription status ── */
export function useSubscription() {
  const query = useQuery({
    queryKey: subscriptionKeys.status(),
    queryFn: getSubscriptionStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

/* ── Offerings (available packages) ── */
export function useOfferings() {
  return useQuery({
    queryKey: subscriptionKeys.offerings(),
    queryFn: getOfferings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/* ── Checkout redirect ── */
export function useCheckout() {
  return {
    checkout: (interval: BillingInterval) => {
      redirectToCheckout(interval).catch(console.error);
    },
  };
}

/* ── Sync subscription (RevenueCat → Supabase) ── */
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
