import { Purchases } from "@revenuecat/purchases-js";

const RC_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY as string;

let instance: Purchases | null = null;
let currentUserId: string | null = null;

/**
 * Returns a singleton Purchases instance for the given user.
 * Call `initRevenueCat(userId)` once after authentication.
 */
export function initRevenueCat(userId: string): Purchases {
  if (instance && currentUserId === userId) {
    return instance;
  }

  if (!RC_API_KEY) {
    console.warn(
      "[RevenueCat] NEXT_PUBLIC_REVENUECAT_API_KEY is not set — subscription features will be unavailable.",
    );
  }

  instance = Purchases.configure(RC_API_KEY, userId);
  currentUserId = userId;
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
  currentUserId = null;
}
