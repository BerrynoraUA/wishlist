import {
  ErrorCode,
  PackageType,
  PurchasesError,
  type CustomerInfo,
  type Package as RevenueCatPackage,
} from "@revenuecat/purchases-js";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getRevenueCat, initRevenueCat, RC_PRO_ENTITLEMENT_ID } from "@/lib/revenuecat";
import { getCurrentSession, getCurrentUser } from "./user";
import { BillingInterval, SubscriptionPlan, type SubscriptionStatus } from "@/types/subscription";

export type RevenueCatPackageSummary = {
  identifier: string;
  interval: BillingInterval;
  title: string;
  description: string | null;
  price: string;
  pricePerMonth: string | null;
};

export class PurchaseCancelledError extends Error {
  constructor() {
    super("Purchase cancelled");
    this.name = "PurchaseCancelledError";
  }
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      plan: SubscriptionPlan.Free,
      isActive: false,
      expiresAt: null,
      revenuecatCustomerId: null,
      paddleSubscriptionId: null,
    };
  }

  const { data, error } = await supabaseBrowser
    .from("user_subscriptions")
    .select("plan, is_active, expires_at, revenuecat_customer_id, paddle_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      plan: SubscriptionPlan.Free,
      isActive: false,
      expiresAt: null,
      revenuecatCustomerId: null,
      paddleSubscriptionId: null,
    };
  }

  return {
    plan: data.plan === "pro" ? SubscriptionPlan.Pro : SubscriptionPlan.Free,
    isActive: data.is_active ?? false,
    expiresAt: data.expires_at ?? null,
    revenuecatCustomerId: data.revenuecat_customer_id ?? null,
    paddleSubscriptionId: data.paddle_subscription_id ?? null,
  };
}

function getPurchasesForUser(userId: string) {
  return getRevenueCat() ?? initRevenueCat(userId);
}

function getPackageInterval(rcPackage: RevenueCatPackage): BillingInterval | null {
  if (rcPackage.packageType === PackageType.Monthly) return BillingInterval.Monthly;
  if (rcPackage.packageType === PackageType.Annual) return BillingInterval.Yearly;

  const period = rcPackage.webBillingProduct.period;
  if (period?.unit === "month" && period.number === 1) return BillingInterval.Monthly;
  if (period?.unit === "year" && period.number === 1) return BillingInterval.Yearly;

  return null;
}

function summarizePackage(rcPackage: RevenueCatPackage): RevenueCatPackageSummary | null {
  const interval = getPackageInterval(rcPackage);
  if (!interval) return null;

  const product = rcPackage.webBillingProduct;

  return {
    identifier: rcPackage.identifier,
    interval,
    title: product.title,
    description: product.description,
    price: product.price.formattedPrice,
    pricePerMonth: product.defaultSubscriptionOption?.base.pricePerMonth?.formattedPrice ?? null,
  };
}

async function getRevenueCatPackages() {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const purchases = getPurchasesForUser(user.id);
  if (!purchases) throw new Error("RevenueCat is not configured");

  const offerings = await purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function getSubscriptionPackages(): Promise<RevenueCatPackageSummary[]> {
  const packages = await getRevenueCatPackages();
  return packages.flatMap((rcPackage) => {
    const summary = summarizePackage(rcPackage);
    return summary ? [summary] : [];
  });
}

async function getPackageForInterval(interval: BillingInterval) {
  const packages = await getRevenueCatPackages();
  const selectedPackage = packages.find((rcPackage) => getPackageInterval(rcPackage) === interval);

  if (!selectedPackage) {
    throw new Error(`RevenueCat ${interval} package is not configured`);
  }

  return selectedPackage;
}

function hasProEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[RC_PRO_ENTITLEMENT_ID]);
}

export async function purchaseSubscription(interval: BillingInterval): Promise<SubscriptionStatus> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const purchases = getPurchasesForUser(user.id);
  if (!purchases) throw new Error("RevenueCat is not configured");

  try {
    const rcPackage = await getPackageForInterval(interval);
    const { customerInfo } = await purchases.purchase({
      rcPackage,
      ...(user.email ? { customerEmail: user.email } : {}),
    });

    if (!hasProEntitlement(customerInfo)) {
      throw new Error("Purchase completed, but Pro access is not active yet");
    }

    return syncSubscription();
  } catch (error) {
    if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) {
      throw new PurchaseCancelledError();
    }

    throw error;
  }
}

export async function openSubscriptionManagement(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const purchases = getPurchasesForUser(user.id);
  if (!purchases) throw new Error("RevenueCat is not configured");

  const customerInfo = await purchases.getCustomerInfo();

  if (!customerInfo.managementURL) {
    throw new Error("Subscription management is not available for this purchase yet.");
  }

  window.open(customerInfo.managementURL, "_blank", "noopener,noreferrer");
}

/**
 * Sync subscription state from RevenueCat -> Supabase
 * by calling our server API which checks RevenueCat and updates the DB.
 */
export async function syncSubscription(): Promise<SubscriptionStatus> {
  const session = await getCurrentSession();

  if (!session) throw new Error("Not authenticated");

  const res = await fetch("/api/server/subscription/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to sync subscription");
  }

  return res.json();
}
