import { NextRequest, NextResponse } from "next/server";
import { createClientWithKey } from "@wishlist/backend/supabase";
import {
  RevenueCatConfigError,
  RevenueCatFetchError,
  syncRevenueCatSubscriber,
} from "@/lib/subscription-sync-server";

const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabaseUser = createClientWithKey(SUPABASE_ANON_KEY);
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await syncRevenueCatSubscriber(user.id);

    console.log(
      `[Subscription Sync] User ${user.id} -> plan=${status.plan}, active=${status.isActive}`,
    );

    return NextResponse.json({
      plan: status.plan,
      isActive: status.isActive,
      expiresAt: status.expiresAt,
      revenuecatCustomerId: status.revenuecatCustomerId,
      paddleSubscriptionId: status.paddleSubscriptionId,
    });
  } catch (err) {
    if (err instanceof RevenueCatConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    if (err instanceof RevenueCatFetchError) {
      console.error("[Subscription Sync] RevenueCat API error:", err.status, err.body);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    console.error("[Subscription Sync] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
