import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSubscriptionPackages,
  getSubscriptionStatus,
  openSubscriptionManagement,
  PurchaseCancelledError,
  purchaseSubscription,
  syncSubscription,
} from "@/api/subscription";
import { SubscriptionPlan, BillingInterval } from "@/types/subscription";

// Query Keys
export const subscriptionKeys = {
  all: ["subscription"] as const,
  status: () => [...subscriptionKeys.all, "status"] as const,
  packages: () => [...subscriptionKeys.all, "packages"] as const,
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
    isPro: query.data?.plan === SubscriptionPlan.Pro && query.data?.isActive === true,
    expiresAt: query.data?.expiresAt ?? null,
  };
}

export function useSubscriptionPackages() {
  return useQuery({
    queryKey: subscriptionKeys.packages(),
    queryFn: getSubscriptionPackages,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutations
export function useCheckout() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: purchaseSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.status(),
      });
      toast.success("Subscription activated");
    },
    onError: (err) => {
      if (err instanceof PurchaseCancelledError) return;
      toast.error(err.message || "Failed to start checkout");
    },
  });

  return {
    ...mutation,
    checkout: (interval: BillingInterval) => mutation.mutate(interval),
  };
}

export function useManageSubscription() {
  return useMutation({
    mutationFn: openSubscriptionManagement,
    onError: (err) => {
      toast.error(err.message || "Could not open subscription management");
    },
  });
}

export function useSyncSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.status(),
      });
      toast.success("Subscription synced");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to sync subscription");
    },
  });
}
