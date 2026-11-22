import type { Purchases } from "@revenuecat/purchases-js";

const RC_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY as string;
export const RC_PRO_ENTITLEMENT_ID = "wishlane-premium";

let instance: Purchases | null = null;
let instanceUserId: string | null = null;
let requestedUserId: string | null = null;

/**
 * Returns a singleton Purchases instance for the given user, or null when
 * RevenueCat is not configured or a newer init/reset superseded this call.
 * The SDK is loaded on first use so pages that never touch billing skip it.
 */
export async function initRevenueCat(userId: string): Promise<Purchases | null> {
  if (instance && instanceUserId === userId) {
    return instance;
  }

  if (!RC_API_KEY) {
    console.warn(
      "[RevenueCat] NEXT_PUBLIC_REVENUECAT_API_KEY is not set — subscription features will be unavailable.",
    );
    return null;
  }

  requestedUserId = userId;
  const { Purchases } = await import("@revenuecat/purchases-js");
  if (requestedUserId !== userId) return null;

  if (instanceUserId !== userId) {
    instance = Purchases.configure({ apiKey: RC_API_KEY, appUserId: userId });
    instanceUserId = userId;
  }
  return instance;
}

/**
 * Returns the current Purchases instance or null if not yet initialised.
 */
export function getRevenueCat(): Purchases | null {
  return instance;
}

/**
 * Tear down the instance (e.g. on logout).
 */
export function resetRevenueCat(): void {
  instance = null;
  instanceUserId = null;
  requestedUserId = null;
}
