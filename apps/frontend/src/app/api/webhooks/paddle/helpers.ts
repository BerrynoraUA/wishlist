import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  grantRevenueCatEntitlement,
  revokeRevenueCatEntitlement,
} from "@/lib/revenuecat-server";
import type {
  PaddleCustomData,
  PaddleEvent,
  PaddleItem,
  PaddleSubscriptionData,
  PaddleTransactionData,
} from "@/types/paddle";

const WEBHOOK_TOLERANCE_SECONDS = 300;

// Supabase user IDs are standard UUIDs — reject anything that doesn't match
// to prevent a malicious actor from injecting arbitrary strings via custom_data.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RevenueCatDuration = "monthly" | "yearly";

type SubscriptionUpsertInput = {
  userId: string;
  plan: "free" | "pro";
  isActive: boolean;
  expiresAt?: string | null;
  paddleSubscriptionId?: string | null;
  paddleCustomerId: string;
};

export function verifyPaddleSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const parts = signature.split(";").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("ts="))?.slice(3);
  const signatures = parts
    .filter((part) => part.startsWith("h1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) return false;

  const parsedTimestamp = parseInt(timestamp, 10);
  if (Number.isNaN(parsedTimestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsedTimestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const payload = `${timestamp}:${rawBody}`;
  const expectedHash = crypto
    .createHmac("sha256", secret.trim())
    .update(payload)
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  return signatures.some((value) => {
    try {
      const actualBuffer = Buffer.from(value, "hex");
      if (actualBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
}

export function parsePaddleEvent(rawBody: string): PaddleEvent {
  return JSON.parse(rawBody) as PaddleEvent;
}

export async function handlePaddleEvent(event: PaddleEvent): Promise<void> {
  console.log(`[Paddle Webhook] Received ${event.event_type}`);

  switch (event.event_type) {
    case "subscription.activated":
    case "subscription.updated":
    case "subscription.resumed":
      await handleActiveSubscription(event.data as PaddleSubscriptionData);
      return;

    case "subscription.canceled":
      await handleCanceledSubscription(event.data as PaddleSubscriptionData);
      return;

    case "subscription.past_due":
      await handlePastDueSubscription(event.data as PaddleSubscriptionData);
      return;

    case "transaction.completed":
      await handleCompletedTransaction(event.data as PaddleTransactionData);
      return;

    case "subscription.created":
    case "transaction.paid":
    case "transaction.ready":
    case "transaction.updated":
    case "address.created":
      logIgnoredEvent(event.event_type);
      return;

    default:
      logIgnoredEvent(event.event_type);
  }
}

function logIgnoredEvent(eventType: string): void {
  console.log(`[Paddle Webhook] Ignoring event type: ${eventType}`);
}

function getUserId(customData?: PaddleCustomData): string | null {
  const userId = customData?.user_id?.trim();
  if (!userId || !UUID_RE.test(userId)) return null;
  return userId;
}

function getRevenueCatDuration(interval: string): RevenueCatDuration {
  return interval === "year" ? "yearly" : "monthly";
}

function getBillingInterval(items: PaddleItem[]): string {
  return items[0]?.price?.billing_cycle?.interval ?? "month";
}

async function handleActiveSubscription(
  data: PaddleSubscriptionData,
): Promise<void> {
  const userId = getUserId(data.custom_data);
  if (!userId) {
    console.error("[Paddle Webhook] Missing user_id in custom_data");
    return;
  }

  const interval = getBillingInterval(data.items);
  const duration = getRevenueCatDuration(interval);
  const periodStart = data.current_billing_period?.starts_at;

  await grantRevenueCatEntitlement(
    userId,
    duration,
    periodStart ? new Date(periodStart).getTime() : undefined,
  );

  await upsertSubscriptionRecord({
    userId,
    plan: "pro",
    isActive: true,
    expiresAt: data.current_billing_period?.ends_at ?? null,
    paddleSubscriptionId: data.id,
    paddleCustomerId: data.customer_id,
  });

  console.log(
    `[Paddle Webhook] Activated subscription for user ${userId}, plan=pro, interval=${interval}`,
  );
}

async function handleCanceledSubscription(
  data: PaddleSubscriptionData,
): Promise<void> {
  const userId = getUserId(data.custom_data);
  if (!userId) {
    console.error("[Paddle Webhook] Missing user_id in custom_data");
    return;
  }

  const effectiveAt =
    data.scheduled_change?.effective_at ??
    data.current_billing_period?.ends_at ??
    null;
  const isStillActive = effectiveAt ? new Date(effectiveAt) > new Date() : false;

  await upsertSubscriptionRecord({
    userId,
    plan: isStillActive ? "pro" : "free",
    isActive: isStillActive,
    expiresAt: effectiveAt,
    paddleSubscriptionId: data.id,
    paddleCustomerId: data.customer_id,
  });

  if (!isStillActive) {
    try {
      await revokeRevenueCatEntitlement(userId);
    } catch (error) {
      console.error("[Paddle Webhook] Failed to revoke RC entitlement:", error);
    }
  }

  console.log(
    `[Paddle Webhook] Subscription canceled for user ${userId}, stillActive=${isStillActive}`,
  );
}

async function handlePastDueSubscription(
  data: PaddleSubscriptionData,
): Promise<void> {
  const userId = getUserId(data.custom_data);
  if (!userId) {
    console.error("[Paddle Webhook] Missing user_id in custom_data");
    return;
  }

  await upsertSubscriptionRecord({
    userId,
    plan: "pro",
    isActive: true,
    paddleSubscriptionId: data.id,
    paddleCustomerId: data.customer_id,
  });

  console.log(
    `[Paddle Webhook] Subscription past_due for user ${userId}, keeping active during grace period`,
  );
}

async function handleCompletedTransaction(
  data: PaddleTransactionData,
): Promise<void> {
  const userId = getUserId(data.custom_data);
  if (!userId) {
    console.log("[Paddle Webhook] transaction.completed without user_id, skipping");
    return;
  }

  const interval = getBillingInterval(data.items);
  const duration = getRevenueCatDuration(interval);

  await grantRevenueCatEntitlement(userId, duration);

  await upsertSubscriptionRecord({
    userId,
    plan: "pro",
    isActive: true,
    paddleSubscriptionId: data.subscription_id ?? null,
    paddleCustomerId: data.customer_id,
  });

  console.log(
    `[Paddle Webhook] Transaction completed for user ${userId}, granted RC ${duration}`,
  );
}

async function upsertSubscriptionRecord(
  input: SubscriptionUpsertInput,
): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
    {
      user_id: input.userId,
      revenuecat_customer_id: input.userId,
      plan: input.plan,
      is_active: input.isActive,
      expires_at: input.expiresAt ?? null,
      paddle_subscription_id: input.paddleSubscriptionId ?? null,
      paddle_customer_id: input.paddleCustomerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[Paddle Webhook] Supabase upsert error:", error);
    throw error;
  }
}