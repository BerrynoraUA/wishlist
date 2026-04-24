import { redirect } from "next/navigation";
import { SubscriptionHeader } from "./components/subscription-header/SubscriptionHeader";
import { PricingCards } from "./components/pricing-cards/PricingCards";
import { FeatureComparison } from "./components/feature-comparison/FeatureComparison";
import { FAQ } from "./components/f-a-q/FAQ";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";

export default function SubscriptionPage() {
  if (!SUBSCRIPTIONS_UI_ENABLED) {
    redirect("/home");
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <SubscriptionHeader />
      <PricingCards />
      <FeatureComparison />
      <FAQ />
    </main>
  );
}
