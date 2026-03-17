export enum SubscriptionPlan {
  Free = "free",
  Pro = "pro",
}

export enum BillingInterval {
  Monthly = "monthly",
  Yearly = "yearly",
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt: string | null;
  revenuecatCustomerId: string | null;
}

export interface PricingTier {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PricingFeature[];
  highlighted?: boolean;
}

export interface PricingFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

/* ── Free-tier limits ── */
export const FREE_LIMITS = {
  maxWishlists: 5,
  maxItemsPerWishlist: 20,
} as const;

/* ── Product IDs (must match RevenueCat dashboard) ── */
export const RC_PRODUCT_IDS = {
  proMonthly: "pro_monthly",
  proYearly: "pro_yearly",
} as const;

/* ── Pricing constants ── */
export const PRICING = {
  monthly: 2.99,
  yearly: 30,
  get yearlySavingsPercent() {
    return Math.round((1 - this.yearly / (this.monthly * 12)) * 100);
  },
} as const;
