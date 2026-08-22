import { useSubscriptionManager } from "@/providers/subscription-provider";
import { useRouter } from "expo-router";
import * as React from "react";

export function useProGate() {
  const { isPro, isLoading, isStatusResolved } = useSubscriptionManager();
  const router = useRouter();

  const openPaywall = React.useCallback(() => {
    router.push("/subscription" as never);
  }, [router]);

  return {
    isPro,
    isLoading,
    // Fail open while the plan is still unknown. `isPro` is false both for a free account
    // and for a subscriber whose status has not loaded yet, and paywalling the second one
    // is far worse than briefly letting the first one through.
    isGated: isStatusResolved && !isPro,
    openPaywall,
  };
}
