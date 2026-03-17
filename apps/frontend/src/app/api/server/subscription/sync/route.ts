import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
const RC_API_KEY = (
  process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_API_KEY
)?.trim();
const RC_PRO_ENTITLEMENT_ID = "Berrynora Pro";

type RevenueCatAccessRecord = {
  expires_date?: string | null;
};

type RevenueCatSubscriber = {
  original_app_user_id?: string | null;
  entitlements?: Record<string, RevenueCatAccessRecord>;
  subscriptions?: Record<string, RevenueCatAccessRecord>;
};

function isFutureDate(value?: string | null) {
  return Boolean(value && new Date(value) > new Date());
}

function getActiveSubscription(subscriber: RevenueCatSubscriber) {
  const entitlement = subscriber.entitlements?.[RC_PRO_ENTITLEMENT_ID];
  if (isFutureDate(entitlement?.expires_date)) {
    return { isActive: true, expiresAt: entitlement?.expires_date ?? null };
  }

  const activeEntitlement = Object.values(subscriber.entitlements ?? {}).find(
    (item) => isFutureDate(item?.expires_date),
  );
  if (activeEntitlement) {
    return {
      isActive: true,
      expiresAt: activeEntitlement.expires_date ?? null,
    };
  }

  const activeSubscription = Object.values(subscriber.subscriptions ?? {}).find(
    (item) => isFutureDate(item?.expires_date),
  );

  return {
    isActive: Boolean(activeSubscription),
    expiresAt: activeSubscription?.expires_date ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!RC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing RevenueCat server API key. Set REVENUECAT_SECRET_API_KEY or REVENUECAT_API_KEY. NEXT_PUBLIC_REVENUECAT_API_KEY is only for the client SDK.",
        },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
      {
        headers: {
          Authorization: `Bearer ${RC_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!rcResponse.ok) {
      if (rcResponse.status === 404) {
        await supabaseAdmin.from("user_subscriptions").upsert(
          {
            user_id: user.id,
            revenuecat_customer_id: user.id,
            plan: "free",
            is_active: false,
            expires_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        return NextResponse.json({
          plan: "free",
          isActive: false,
          expiresAt: null,
          revenuecatCustomerId: null,
        });
      }

      const upstreamBody = await rcResponse.text();

      console.error(
        "[Subscription Sync] RevenueCat API error:",
        rcResponse.status,
        upstreamBody,
      );

      return NextResponse.json(
        {
          error: "Failed to fetch subscription from RevenueCat",
          revenueCatStatus: rcResponse.status,
          revenueCatBody: upstreamBody,
        },
        { status: 502 },
      );
    }

    const rcData = await rcResponse.json();
    const subscriber = (rcData.subscriber ?? {}) as RevenueCatSubscriber;
    const { isActive, expiresAt } = getActiveSubscription(subscriber);
    const isPro = isActive;
    const plan = isPro ? "pro" : "free";
    const rcCustomerId = subscriber?.original_app_user_id ?? user.id;

    const { error: dbError } = await supabaseAdmin
      .from("user_subscriptions")
      .upsert(
        {
          user_id: user.id,
          revenuecat_customer_id: rcCustomerId,
          plan,
          is_active: isActive,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (dbError) {
      console.error("[Subscription Sync] Supabase upsert error:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(
      `[Subscription Sync] User ${user.id} → plan=${plan}, active=${isActive}`,
    );

    return NextResponse.json({
      plan,
      isActive,
      expiresAt,
      revenuecatCustomerId: rcCustomerId,
    });
  } catch (err) {
    console.error("[Subscription Sync] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
