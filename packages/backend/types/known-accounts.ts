export type KnownAccountProvider = "email" | "google" | "apple" | "facebook" | "unknown";

export type KnownAccount = {
  userId: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  provider: KnownAccountProvider;
  providers?: KnownAccountProvider[];
  lastUsedAt: number;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  defaultAccent?: number | null;
  themePreference?: "light" | "dark" | "system" | null;
  preferredLocale?: string | null;
};

const SUPPORTED_AUTH_PROVIDERS = ["email", "google", "apple", "facebook"] as const;

/** Narrow a raw auth-provider string to a known provider, defaulting to "email". */
export function toKnownAccountProvider(raw: string): KnownAccountProvider {
  return (SUPPORTED_AUTH_PROVIDERS as readonly string[]).includes(raw)
    ? (raw as KnownAccountProvider)
    : "email";
}

export const KNOWN_ACCOUNTS_STORAGE_KEY = "wishlist:known-accounts:v1";
export const KNOWN_ACCOUNTS_CHANGE_EVENT = "wishlist:known-accounts-change";
export const KNOWN_ACCOUNTS_LIMIT = 5;
