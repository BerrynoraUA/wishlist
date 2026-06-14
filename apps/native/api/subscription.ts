import { supabase } from "@wishlist/backend/supabase/native";
import { SubscriptionPlan, type SubscriptionStatus } from "@wishlist/backend/types/subscription";

const WEB_APP_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://wishlane.net").replace(/\/$/, "");

async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session;
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
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

  const { data, error } = await supabase
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

export async function syncSubscription(): Promise<SubscriptionStatus> {
  const session = await getCurrentSession();

  if (!session) throw new Error("Not authenticated");

  const response = await fetch(`${WEB_APP_URL}/api/server/subscription/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const serverMessage =
      typeof body.error === "string" ? body.error : "Failed to sync subscription";

    if (response.status === 401) {
      throw new Error(
        `${serverMessage}. Check that EXPO_PUBLIC_WEB_URL points to the web backend using the same Supabase project as the native app.`,
      );
    }

    throw new Error(serverMessage);
  }

  return response.json();
}
