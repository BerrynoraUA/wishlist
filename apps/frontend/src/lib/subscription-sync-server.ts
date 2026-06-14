import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RC_API_KEY = process.env.REVENUECAT_SECRET_API_KEY?.trim();
const RC_PRO_ENTITLEMENT_ID = "pro_access";
const RC_API_BASE = "https://api.revenuecat.com/v1";

type RevenueCatAccessRecord = {
  expires_date?: string | null;
};

type RevenueCatSubscriber = {
  original_app_user_id?: string | null;
  entitlements?: Record<string, RevenueCatAccessRecord>;
};

export type SyncedSubscriptionStatus = {
  plan: "free" | "pro";
  isActive: boolean;
  expiresAt: string | null;
  revenuecatCustomerId: string | null;
  paddleSubscriptionId: null;
};

export class RevenueCatConfigError extends Error {
  constructor() {
    super(
      "Missing RevenueCat server API key. Set REVENUECAT_SECRET_API_KEY. NEXT_PUBLIC_REVENUECAT_API_KEY is only for the client SDK.",
    );
    this.name = "RevenueCatConfigError";
  }
}

export class RevenueCatFetchError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super("Failed to fetch subscription data");
    this.name = "RevenueCatFetchError";
  }
}

function isFutureDate(value?: string | null) {
  return Boolean(value && new Date(value) > new Date());
}

function getActiveSubscription(subscriber: RevenueCatSubscriber) {
  const entitlement = subscriber.entitlements?.[RC_PRO_ENTITLEMENT_ID];
  if (isFutureDate(entitlement?.expires_date)) {
    return { isActive: true, expiresAt: entitlement?.expires_date ?? null };
  }

  return {
    isActive: false,
    expiresAt: null,
  };
}

function freeStatus(appUserId: string): SyncedSubscriptionStatus {
  return {
    plan: "free",
    isActive: false,
    expiresAt: null,
    revenuecatCustomerId: appUserId,
    paddleSubscriptionId: null,
  };
}

async function upsertSubscription(appUserId: string, status: SyncedSubscriptionStatus) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
    {
      user_id: appUserId,
      revenuecat_customer_id: status.revenuecatCustomerId,
      plan: status.plan,
      is_active: status.isActive,
      expires_at: status.expiresAt,
      paddle_subscription_id: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function syncRevenueCatSubscriber(
  appUserId: string,
): Promise<SyncedSubscriptionStatus> {
  if (!RC_API_KEY) {
    throw new RevenueCatConfigError();
  }

  const rcResponse = await fetch(`${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${RC_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!rcResponse.ok) {
    if (rcResponse.status === 404) {
      const status = freeStatus(appUserId);
      await upsertSubscription(appUserId, status);
      return status;
    }

    throw new RevenueCatFetchError(rcResponse.status, await rcResponse.text());
  }

  const rcData = await rcResponse.json();
  const subscriber = (rcData.subscriber ?? {}) as RevenueCatSubscriber;
  const { isActive, expiresAt } = getActiveSubscription(subscriber);
  const status: SyncedSubscriptionStatus = {
    plan: isActive ? "pro" : "free",
    isActive,
    expiresAt,
    revenuecatCustomerId: subscriber.original_app_user_id ?? appUserId,
    paddleSubscriptionId: null,
  };

  await upsertSubscription(appUserId, status);
  return status;
}
