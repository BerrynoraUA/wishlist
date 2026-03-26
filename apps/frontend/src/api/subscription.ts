import { supabaseBrowser } from "@/lib/supabase-browser";
import { getRevenueCat } from "@/lib/revenuecat";
import { getPaddle } from "@/lib/paddle";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInterval,
  RC_CHECKOUT_BASE_URL,
  RC_PACKAGE_IDS,
  RC_PRODUCT_IDS,
  PADDLE_PRICE_IDS,
} from "@/types/subscription";

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
   Paddle checkout (web)
   ──────────────────────────────────────── */

/**
 * Opens the Paddle inline checkout overlay.
 * Passes the Supabase user ID inside `customData` so the
 * webhook can map the payment back to the correct user.
 */
export async function openPaddleCheckout(
  interval: BillingInterval,
): Promise<void> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const paddle = getPaddle();
  if (!paddle) throw new Error("Paddle not initialised");

  const priceId =
    interval === BillingInterval.Monthly
      ? PADDLE_PRICE_IDS.proMonthly
      : PADDLE_PRICE_IDS.proYearly;

  if (!priceId) throw new Error("Paddle price ID not configured");

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(user.email ? { customer: { email: user.email } } : {}),
    customData: { user_id: user.id },
  });
}

/* ────────────────────────────────────────
   Legacy RevenueCat checkout (kept for reference)
   ──────────────────────────────────────── */

export function buildCheckoutUrl(
  userId: string,
  interval: BillingInterval,
): string {
  const packageId =
    interval === BillingInterval.Monthly
      ? RC_PACKAGE_IDS.proMonthly
      : RC_PACKAGE_IDS.proYearly;

  return `${RC_CHECKOUT_BASE_URL}/${encodeURIComponent(userId)}?package_id=${encodeURIComponent(packageId)}`;
}

/* ────────────────────────────────────────
   RevenueCat sync helpers
   ──────────────────────────────────────── */

/**
 * Sync subscription state from RevenueCat → Supabase
 * by calling our server API which checks RevenueCat and updates the DB.
 */
export async function syncSubscription(): Promise<SubscriptionStatus> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

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

/**
 * Fetch available packages from RevenueCat (client-side SDK).
 */
export async function getOfferings() {
  const rc = getRevenueCat();
  if (!rc) return [];

  const offerings = await rc.getOfferings();
  const current = offerings.current;
  if (!current) return [];

  return current.availablePackages;
}

/**
 * Restore purchases — re-syncs RevenueCat state to Supabase.
 */
export async function restorePurchases(): Promise<SubscriptionStatus> {
  return syncSubscription();
}

export { RC_PRODUCT_IDS, RC_PACKAGE_IDS };
