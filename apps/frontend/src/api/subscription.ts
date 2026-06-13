import { supabaseBrowser } from "@/lib/supabase-browser";
import { getPaddle } from "@/lib/paddle";
import { getCurrentSession, getCurrentUser } from "./user";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInterval,
  PADDLE_PRICE_IDS,
} from "@/types/subscription";

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

/**
 * Opens the Paddle inline checkout overlay.
 * Passes the Supabase user ID inside customData so the
 * webhook can map the payment back to the correct user.
 */
export async function openPaddleCheckout(interval: BillingInterval): Promise<void> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const paddle = getPaddle();
  if (!paddle) throw new Error("Paddle not initialised");

  const priceId =
    interval === BillingInterval.Monthly ? PADDLE_PRICE_IDS.proMonthly : PADDLE_PRICE_IDS.proYearly;

  if (!priceId) throw new Error("Paddle price ID not configured");

  const successUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/subscription?checkout=success`
      : undefined;

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(user.email ? { customer: { email: user.email } } : {}),
    settings: {
      displayMode: "overlay",
      variant: "multi-page",
      ...(successUrl ? { successUrl } : {}),
    },
    customData: { user_id: user.id },
  });
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
