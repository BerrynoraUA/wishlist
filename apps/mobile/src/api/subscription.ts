import { supabase } from "@/lib/supabase";
import { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import Purchases, { PurchasesPackage } from "react-native-purchases";

/* ── Entitlement helpers ── */

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      plan: SubscriptionPlan.Free,
      isActive: false,
      expiresAt: null,
      revenuecatCustomerId: null,
    };
  }

  const { data, error } = await supabase
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

/* ── Purchase helpers ── */

export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages;
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}
