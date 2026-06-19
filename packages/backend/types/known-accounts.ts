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
};

export const KNOWN_ACCOUNTS_STORAGE_KEY = "wishlist:known-accounts:v1";
export const KNOWN_ACCOUNTS_CHANGE_EVENT = "wishlist:known-accounts-change";
export const KNOWN_ACCOUNTS_LIMIT = 5;
