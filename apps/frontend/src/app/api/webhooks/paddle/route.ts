import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  grantRevenueCatEntitlement,
  revokeRevenueCatEntitlement,
} from "@/lib/revenuecat-server";

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET as string;

function verifyPaddleSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const parts = signature.split(";");
  const tsStr = parts.find((p) => p.startsWith("ts="))?.slice(3);
  const h1 = parts.find((p) => p.startsWith("h1="))?.slice(3);

  if (!tsStr || !h1) return false;

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const ts = parseInt(tsStr, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  const payload = `${tsStr}:${rawBody}`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(h1),
      Buffer.from(expectedHash),
    );
  } catch {
    return false;
  }
}


function paddleIntervalToRCDuration(interval: string): "monthly" | "yearly" {
  return interval === "year" ? "yearly" : "monthly";
}

function getBillingInterval(items: PaddleItem[]): string {
  return items[0]?.price?.billing_cycle?.interval ?? "month";
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paddle-Signature");

  if (!verifyPaddleSignature(rawBody, signature, PADDLE_WEBHOOK_SECRET)) {
    console.error("[Paddle Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: PaddleEvent;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.event_type;
  const data = body.data;

  console.log(`[Paddle Webhook] Received ${eventType}`);

  try {
    switch (eventType) {
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.resumed":
        await handleSubscriptionActive(data as PaddleSubscriptionData);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(data as PaddleSubscriptionData);
        break;

      case "subscription.past_due":
        await handleSubscriptionPastDue(data as PaddleSubscriptionData);
        break;

      case "transaction.completed":
        await handleTransactionCompleted(data as PaddleTransactionData);
        break;

      default:
        console.log(`[Paddle Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[Paddle Webhook] Error handling ${eventType}:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleSubscriptionActive(data: PaddleSubscriptionData) {
  const userId = data.custom_data?.user_id;
  if (!userId) {
    console.error("[Paddle Webhook] Missing user_id in custom_data");
    return;
  }

  const interval = getBillingInterval(data.items);
  const rcDuration = paddleIntervalToRCDuration(interval);
  const periodStart = data.current_billing_period?.starts_at;
  const periodEnd = data.current_billing_period?.ends_at;

  await grantRevenueCatEntitlement(
    userId,
    rcDuration,
    periodStart ? new Date(periodStart).getTime() : undefined,
  );

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
    {
      user_id: userId,
      revenuecat_customer_id: userId,
      plan: "pro",
      is_active: true,
      expires_at: periodEnd ?? null,
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customer_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[Paddle Webhook] Supabase upsert error:", error);
    throw error;
  }

  console.log(
    `[Paddle Webhook] Activated subscription for user ${userId}, plan=pro, interval=${interval}`,
  );
}

async function handleSubscriptionCanceled(data: PaddleSubscriptionData) {
  const userId = data.custom_data?.user_id;
  if (!userId) {
    console.error("[Paddle Webhook] Missing user_id in custom_data");
    return;
  }

  const periodEnd = data.current_billing_period?.ends_at;
  const effectiveAt = data.scheduled_change?.effective_at ?? periodEnd;

  // Determine if the subscription is still in its paid period
  const isStillActive = effectiveAt
    ? new Date(effectiveAt) > new Date()
    : false;

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
    {
      user_id: userId,
      revenuecat_customer_id: userId,
      plan: isStillActive ? "pro" : "free",
      is_active: isStillActive,
      expires_at: effectiveAt ?? null,
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customer_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[Paddle Webhook] Supabase upsert error:", error);
    throw error;
  }

  // If fully expired, revoke RC entitlement
  if (!isStillActive) {
    try {
      await revokeRevenueCatEntitlement(userId);
    } catch (e) {
      console.error("[Paddle Webhook] Failed to revoke RC entitlement:", e);
    }
  }

  console.log(
    `[Paddle Webhook] Subscription canceled for user ${userId}, stillActive=${isStillActive}`,
  );
}

async function handleSubscriptionPastDue(data: PaddleSubscriptionData) {
  const userId = data.custom_data?.user_id;
  if (!userId) {
    console.error("[Paddle Webhook] Missing user_id in custom_data");
    return;
  }

  // Keep active during Paddle's grace period
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
    {
      user_id: userId,
      revenuecat_customer_id: userId,
      plan: "pro",
      is_active: true,
      paddle_subscription_id: data.id,
      paddle_customer_id: data.customer_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[Paddle Webhook] Supabase upsert error:", error);
    throw error;
  }

  console.log(
    `[Paddle Webhook] Subscription past_due for user ${userId} — keeping active during grace period`,
  );
}

async function handleTransactionCompleted(data: PaddleTransactionData) {
  const userId = data.custom_data?.user_id;
  if (!userId) {
    // Transaction may not have custom_data (e.g. non-subscription transactions)
    console.log(
      "[Paddle Webhook] transaction.completed without user_id — skipping",
    );
    return;
  }

  // Fires for initial & renewal payments — grant/extend RC entitlement
  const interval = getBillingInterval(data.items);
  const rcDuration = paddleIntervalToRCDuration(interval);

  await grantRevenueCatEntitlement(userId, rcDuration);

  console.log(
    `[Paddle Webhook] Transaction completed for user ${userId}, granted RC ${rcDuration}`,
  );
}
