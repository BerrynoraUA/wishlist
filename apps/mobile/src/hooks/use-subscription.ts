import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionStatus,
  getOfferings,
  purchasePackage,
} from "@/api/subscription";
import { SubscriptionPlan } from "@/types/subscription";
import type { PurchasesPackage } from "react-native-purchases";

export const subscriptionKeys = {
  all: ["subscription"] as const,
  status: () => [...subscriptionKeys.all, "status"] as const,
  offerings: () => [...subscriptionKeys.all, "offerings"] as const,
};

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

export function useOfferings() {
  return useQuery({
    queryKey: subscriptionKeys.offerings(),
    queryFn: getOfferings,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pkg: PurchasesPackage) => purchasePackage(pkg),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.status(),
      });
    },
  });
}
