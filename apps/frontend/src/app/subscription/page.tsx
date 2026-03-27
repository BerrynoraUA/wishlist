"use client";

import { SubscriptionHeader } from "./components/SubscriptionHeader";
import { PricingCards } from "./components/PricingCards";
import { FeatureComparison } from "./components/FeatureComparison";
import { FAQ } from "./components/FAQ";

export default function SubscriptionPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <SubscriptionHeader />
      <PricingCards />
      <FeatureComparison />
      <FAQ />
    </main>
  );
}
