import {
  KNOWN_ACCOUNTS_LIMIT,
  KNOWN_ACCOUNTS_STORAGE_KEY,
  type KnownAccount,
  type KnownAccountProvider,
} from "@wishlist/backend/types/known-accounts";
import * as SecureStore from "expo-secure-store";

const KNOWN_ACCOUNTS_SECURE_STORE_KEY = KNOWN_ACCOUNTS_STORAGE_KEY.replace(
  /[^A-Za-z0-9._-]/g,
  "_",
);
let storageQueue = Promise.resolve();

function enqueueStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
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

async function readRaw(): Promise<KnownAccount[]> {
  const rawValue = await SecureStore.getItemAsync(KNOWN_ACCOUNTS_SECURE_STORE_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      await SecureStore.deleteItemAsync(KNOWN_ACCOUNTS_SECURE_STORE_KEY);
      return [];
    }
    return parsed.filter(isValidAccount);
  } catch {
    await SecureStore.deleteItemAsync(KNOWN_ACCOUNTS_SECURE_STORE_KEY);
    return [];
  }
}

async function writeRaw(accounts: KnownAccount[]) {
  const trimmed = [...accounts]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, KNOWN_ACCOUNTS_LIMIT);

  await SecureStore.setItemAsync(KNOWN_ACCOUNTS_SECURE_STORE_KEY, JSON.stringify(trimmed));
}

export async function listKnownAccounts(): Promise<KnownAccount[]> {
  return enqueueStorageOperation(async () => {
    const accounts = await readRaw();
    return accounts.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  });
}

export async function getKnownAccount(userId: string): Promise<KnownAccount | null> {
  return enqueueStorageOperation(async () => {
    const accounts = await readRaw();
    return accounts.find((item) => item.userId === userId) ?? null;
  });
}

export async function upsertKnownAccount(
  account: Partial<KnownAccount> & Pick<KnownAccount, "userId">,
) {
  return enqueueStorageOperation(async () => {
    const accounts = await readRaw();
    const existing = accounts.find((item) => item.userId === account.userId);

    const next: KnownAccount = {
      userId: account.userId,
      email: account.email ?? existing?.email ?? "",
      displayName:
        account.displayName !== undefined ? account.displayName : (existing?.displayName ?? null),
      avatarUrl:
        account.avatarUrl !== undefined ? account.avatarUrl : (existing?.avatarUrl ?? null),
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
    };

    const withoutExisting = accounts.filter((item) => item.userId !== account.userId);
    await writeRaw([...withoutExisting, next]);
  });
}

export async function removeKnownAccount(userId: string) {
  return enqueueStorageOperation(async () => {
    const accounts = await readRaw();
    const next = accounts.filter((item) => item.userId !== userId);

    if (next.length === accounts.length) return;
    await writeRaw(next);
  });
}
