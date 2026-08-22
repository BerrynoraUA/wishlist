import {
  KNOWN_ACCOUNTS_CHANGE_EVENT,
  KNOWN_ACCOUNTS_LIMIT,
  KNOWN_ACCOUNTS_STORAGE_KEY,
  type KnownAccount,
  type KnownAccountProvider,
} from "@/types/known-accounts";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function notifyKnownAccountsChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(KNOWN_ACCOUNTS_CHANGE_EVENT));
}

function mergeProviders(
  incoming: KnownAccountProvider[] | undefined,
  existing: KnownAccountProvider[] | undefined,
  latest: KnownAccountProvider | undefined,
): KnownAccountProvider[] {
  const merged = new Set<KnownAccountProvider>();
  for (const value of existing ?? []) merged.add(value);
  for (const value of incoming ?? []) merged.add(value);
  if (latest && latest !== "unknown") merged.add(latest);
  return Array.from(merged);
}

function isValidAccount(value: unknown): value is KnownAccount {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<KnownAccount>;
  return (
    typeof candidate.userId === "string" &&
    candidate.userId.length > 0 &&
    typeof candidate.email === "string" &&
    typeof candidate.provider === "string" &&
    typeof candidate.lastUsedAt === "number"
  );
}

function readRaw(storage: Storage): KnownAccount[] {
  const rawValue = storage.getItem(KNOWN_ACCOUNTS_STORAGE_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      storage.removeItem(KNOWN_ACCOUNTS_STORAGE_KEY);
      return [];
    }
    return parsed.filter(isValidAccount);
  } catch {
    storage.removeItem(KNOWN_ACCOUNTS_STORAGE_KEY);
    return [];
  }
}

function writeRaw(storage: Storage, accounts: KnownAccount[]) {
  const trimmed = [...accounts]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, KNOWN_ACCOUNTS_LIMIT);

  storage.setItem(KNOWN_ACCOUNTS_STORAGE_KEY, JSON.stringify(trimmed));
  notifyKnownAccountsChange();
}

export function listKnownAccounts(): KnownAccount[] {
  const storage = getStorage();
  if (!storage) return [];

  return readRaw(storage).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export function getKnownAccount(userId: string): KnownAccount | null {
  const storage = getStorage();
  if (!storage) return null;
  return readRaw(storage).find((item) => item.userId === userId) ?? null;
}

export function upsertKnownAccount(account: Partial<KnownAccount> & Pick<KnownAccount, "userId">) {
  const storage = getStorage();
  if (!storage) return;

  const accounts = readRaw(storage);
  const existing = accounts.find((item) => item.userId === account.userId);

  const next: KnownAccount = {
    userId: account.userId,
    email: account.email ?? existing?.email ?? "",
    displayName:
      account.displayName !== undefined ? account.displayName : (existing?.displayName ?? null),
    avatarUrl: account.avatarUrl !== undefined ? account.avatarUrl : (existing?.avatarUrl ?? null),
    provider: account.provider ?? existing?.provider ?? "unknown",
    providers: mergeProviders(
      account.providers,
      existing?.providers,
      account.provider ?? existing?.provider,
    ),
    lastUsedAt: account.lastUsedAt ?? existing?.lastUsedAt ?? Date.now(),
    accessToken:
      account.accessToken !== undefined ? account.accessToken : (existing?.accessToken ?? null),
    refreshToken:
      account.refreshToken !== undefined ? account.refreshToken : (existing?.refreshToken ?? null),
    expiresAt: account.expiresAt !== undefined ? account.expiresAt : (existing?.expiresAt ?? null),
    defaultAccent:
      account.defaultAccent !== undefined
        ? account.defaultAccent
        : (existing?.defaultAccent ?? null),
    themePreference:
      account.themePreference !== undefined
        ? account.themePreference
        : (existing?.themePreference ?? null),
    preferredLocale:
      account.preferredLocale !== undefined
        ? account.preferredLocale
        : (existing?.preferredLocale ?? null),
  };

  const withoutExisting = accounts.filter((item) => item.userId !== account.userId);
  writeRaw(storage, [...withoutExisting, next]);
}

export function removeKnownAccount(userId: string) {
  const storage = getStorage();
  if (!storage) return;

  const accounts = readRaw(storage);
  const next = accounts.filter((item) => item.userId !== userId);

  if (next.length === accounts.length) return;
  writeRaw(storage, next);
}

export function clearKnownAccounts() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(KNOWN_ACCOUNTS_STORAGE_KEY);
  notifyKnownAccountsChange();
}
