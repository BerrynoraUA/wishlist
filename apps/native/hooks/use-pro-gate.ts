import { useSubscriptionManager } from "@/providers/subscription-provider";
import { useRouter } from "expo-router";
import * as React from "react";

export function useProGate() {
  const { isPro, isLoading } = useSubscriptionManager();
  const router = useRouter();

  const openPaywall = React.useCallback(() => {
    router.push("/subscription" as never);
  }, [router]);

  return {
    isPro,
    isLoading,
    isGated: !isPro,
    openPaywall,
  };
}
