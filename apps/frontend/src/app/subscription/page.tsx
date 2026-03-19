"use client";

import { useEffect } from "react";
import { SubscriptionHeader } from "./components/SubscriptionHeader";
import { PricingCards } from "./components/PricingCards";
import { FeatureComparison } from "./components/FeatureComparison";
import { FAQ } from "./components/FAQ";
import { useSyncSubscription } from "@/hooks/use-subscription";

export default function SubscriptionPage() {
  const syncSubscription = useSyncSubscription();

  // Force a RevenueCat -> Supabase sync when the user returns to the tab
  // after completing checkout in a separate window.
  useEffect(() => {
    function handleFocus() {
      syncSubscription.mutate();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [syncSubscription]);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <SubscriptionHeader />
      <PricingCards />
      <FeatureComparison />
      <FAQ />
    </main>
  );
}
