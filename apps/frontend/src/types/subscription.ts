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

export const FREE_LIMITS = {
  maxWishlists: 5,
  maxItemsPerWishlist: 10,
  maxSecretSantaEvents: 1,
} as const;

export const PADDLE_PRICE_IDS = {
  proMonthly: process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID ?? "",
  proYearly: process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID ?? "",
} as const;

export const PRICING = {
  monthly: 0.99,
  yearly: 1,
  get yearlySavingsPercent() {
    return Math.round((1 - this.yearly / (this.monthly * 12)) * 100);
  },
} as const;
