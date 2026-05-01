function normalizeEnv(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function isLocalHost(host: string): boolean {
  return host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0");
}

function resolveSubscriptionsUiEnabled(): boolean {
  const appEnv = normalizeEnv(process.env.NEXT_PUBLIC_APP_ENV);
  const vercelEnv = normalizeEnv(process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV);
  const appUrl = normalizeEnv(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL);

  const isProductionEnv =
    appEnv === "production" ||
    appEnv === "prod" ||
    vercelEnv === "production" ||
    (appUrl.includes("wishlane.net") && !appUrl.includes("staging.wishlane.net"));

  if (isProductionEnv) {
    return false;
  }

  const isStagingEnv =
    appEnv === "staging" ||
    appEnv === "stage" ||
    appEnv === "development" ||
    appEnv === "dev" ||
    vercelEnv === "preview" ||
    appUrl.includes("staging.wishlane.net") ||
    isLocalHost(appUrl);

  if (isStagingEnv) {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

export const SUBSCRIPTIONS_UI_ENABLED = resolveSubscriptionsUiEnabled();
