import { supabaseBrowser } from "@/lib/supabase-browser";
import { getRevenueCat } from "@/lib/revenuecat";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  RC_PRODUCT_IDS,
} from "@/types/subscription";
import type { Package } from "@revenuecat/purchases-js";

/* ────────────────────────────────────────
   Entitlement helpers
   ──────────────────────────────────────── */

/**
 * Primary source of truth: Supabase `user_subscriptions` table.
 * Falls back to free plan if no row exists.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) {
    return {
      plan: SubscriptionPlan.Free,
      isActive: false,
      expiresAt: null,
      revenuecatCustomerId: null,
    };
  }

  const { data, error } = await supabaseBrowser
    .from("user_subscriptions")
    .select("plan, is_active, expires_at, revenuecat_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      plan: SubscriptionPlan.Free,
      isActive: false,
      expiresAt: null,
      revenuecatCustomerId: null,
    };
  }

  return {
    plan: data.plan === "pro" ? SubscriptionPlan.Pro : SubscriptionPlan.Free,
    isActive: data.is_active ?? false,
    expiresAt: data.expires_at ?? null,
    revenuecatCustomerId: data.revenuecat_customer_id ?? null,
  };
}

/* ────────────────────────────────────────
   Purchase helpers
   ──────────────────────────────────────── */

/**
 * Fetch available packages from RevenueCat.
 */
export async function getOfferings(): Promise<Package[]> {
  const rc = getRevenueCat();
  if (!rc) return [];

  const offerings = await rc.getOfferings();
  const current = offerings.current;
  if (!current) return [];

  return current.availablePackages;
}

/**
 * Initiate a purchase for a given package.
 */
export async function purchasePackage(pkg: Package) {
  const rc = getRevenueCat();
  if (!rc) throw new Error("RevenueCat not initialised");

  const { customerInfo } = await rc.purchase({ rcPackage: pkg });
  return customerInfo;
}

/**
 * Restore purchases (useful for cross-platform).
 */
export async function restorePurchases() {
  const rc = getRevenueCat();
  if (!rc) throw new Error("RevenueCat not initialised");

  // For web, we re-fetch customer info which includes all entitlements
  const customerInfo = await rc.getCustomerInfo();
  return customerInfo;
}

/**
 * Find a specific package by product ID.
 */
export function findPackageByProductId(
  packages: Package[],
  productId: string,
): Package | undefined {
  return packages.find((pkg) => pkg.rcBillingProduct?.identifier === productId);
}

export { RC_PRODUCT_IDS };
