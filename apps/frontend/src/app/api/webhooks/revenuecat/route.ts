import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RC_WEBHOOK_AUTH_KEY = process.env.REVENUECAT_WEBHOOK_AUTH_KEY as string;

/**
 * RevenueCat webhook handler.
 * Receives subscription lifecycle events and syncs them to the
 * `user_subscriptions` table in Supabase using the service-role key.
 *
 * Expected events: INITIAL_PURCHASE, RENEWAL, CANCELLATION,
 * EXPIRATION, PRODUCT_CHANGE, BILLING_ISSUE, SUBSCRIBER_ALIAS,
 * UNCANCELLATION
 */
export async function POST(request: NextRequest) {
  // ── Validate auth header ──
  const authHeader = request.headers.get("Authorization");
  if (!RC_WEBHOOK_AUTH_KEY || authHeader !== `Bearer ${RC_WEBHOOK_AUTH_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const event = body?.event;
    if (!event) {
      return NextResponse.json(
        { error: "Missing event payload" },
        { status: 400 },
      );
    }

    const eventType: string = event.type;
    const appUserId: string | undefined = event.app_user_id;
    const expirationAtMs: number | undefined = event.expiration_at_ms;
    const productId: string | undefined = event.product_id;

    if (!appUserId) {
      return NextResponse.json(
        { error: "Missing app_user_id" },
        { status: 400 },
      );
    }

    const isPro = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "PRODUCT_CHANGE",
      "UNCANCELLATION",
    ].includes(eventType);

    const isExpired = ["EXPIRATION", "BILLING_ISSUE"].includes(eventType);

    const isCancelled = eventType === "CANCELLATION";

    // Determine subscription state
    const plan = isPro ? "pro" : isExpired ? "free" : "pro"; // keep pro on cancel until expires
    const isActive = isPro || (isCancelled && !isExpired);
    const expiresAt = expirationAtMs
      ? new Date(expirationAtMs).toISOString()
      : null;

    const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
      {
        user_id: appUserId,
        revenuecat_customer_id: event.original_app_user_id ?? appUserId,
        plan: isExpired ? "free" : plan,
        is_active: isActive,
        expires_at: expiresAt,
        product_id: productId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("[RevenueCat Webhook] Supabase upsert error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(
      `[RevenueCat Webhook] ${eventType} for user ${appUserId} → plan=${plan}, active=${isActive}, product=${productId ?? "n/a"}`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[RevenueCat Webhook] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
