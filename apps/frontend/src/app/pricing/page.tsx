import type { Metadata } from "next";
import { PricingView } from "./components/PricingView";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Wishlane pricing — start free, or upgrade to Pro for unlimited wishlists, collaborative lists, and more.",
  // Reachable via direct link only for now: keep it out of search indexes until launch.
  robots: { index: false, follow: false },
};

export default function PricingPage() {
  return <PricingView />;
}
