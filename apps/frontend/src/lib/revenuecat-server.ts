import "server-only";

const RC_API_KEY = (
  process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_API_KEY
)?.trim();

const RC_PRO_ENTITLEMENT_ID = "Berrynora Pro";
const RC_API_BASE = "https://api.revenuecat.com/v1";

type RCDuration =
  | "monthly"
  | "yearly";


export async function grantRevenueCatEntitlement(
  appUserId: string,
  duration: RCDuration,
  startTimeMs?: number,
): Promise<void> {
  if (!RC_API_KEY) {
    throw new Error("Missing REVENUECAT_SECRET_API_KEY");
  }

  const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(RC_PRO_ENTITLEMENT_ID)}/promotional`;

  const body: Record<string, unknown> = { duration };
  if (startTimeMs) {
    body.start_time_ms = startTimeMs;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RC_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[RevenueCat] Failed to grant entitlement for ${appUserId}:`,
      res.status,
      text,
    );
    throw new Error(`RevenueCat grant failed: ${res.status}`);
  }

  console.log(
    `[RevenueCat] Granted "${RC_PRO_ENTITLEMENT_ID}" to ${appUserId} (${duration})`,
  );
}


export async function revokeRevenueCatEntitlement(
  appUserId: string,
): Promise<void> {
  if (!RC_API_KEY) {
    throw new Error("Missing REVENUECAT_SECRET_API_KEY");
  }

  const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(RC_PRO_ENTITLEMENT_ID)}/revoke_promotionals`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RC_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[RevenueCat] Failed to revoke entitlement for ${appUserId}:`,
      res.status,
      text,
    );
    throw new Error(`RevenueCat revoke failed: ${res.status}`);
  }

  console.log(
    `[RevenueCat] Revoked "${RC_PRO_ENTITLEMENT_ID}" for ${appUserId}`,
  );
}
