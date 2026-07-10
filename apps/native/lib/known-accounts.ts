import {
  KNOWN_ACCOUNTS_LIMIT,
  KNOWN_ACCOUNTS_STORAGE_KEY,
  type KnownAccount,
  type KnownAccountProvider,
} from "@wishlist/backend/types/known-accounts";
import * as SecureStore from "expo-secure-store";

const KNOWN_ACCOUNTS_SECURE_STORE_KEY = KNOWN_ACCOUNTS_STORAGE_KEY.replace(/[^A-Za-z0-9._-]/g, "_");
const KNOWN_ACCOUNT_SECRET_KEY_PREFIX = "wishlist.known-account-secret.";
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
let storageQueue = Promise.resolve();

type KnownAccountMetadata = Omit<KnownAccount, "accessToken" | "refreshToken">;
type StoredKnownAccount = KnownAccountMetadata & {
  accessToken?: string | null;
  refreshToken?: string | null;
};

export type NativeKnownAccountInput = Omit<Partial<KnownAccount>, "accessToken"> &
  Pick<KnownAccount, "userId"> & { accessToken?: never };

let legacyMigrationPromise: Promise<void> | null = null;

function getAccountSecretKey(userId: string) {
  return `${KNOWN_ACCOUNT_SECRET_KEY_PREFIX}${userId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

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

function isValidAccount(value: unknown): value is KnownAccountMetadata {
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

async function readAccountsMetadata(): Promise<KnownAccountMetadata[]> {
  const rawValue = await SecureStore.getItemAsync(KNOWN_ACCOUNTS_SECURE_STORE_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidAccount).map((storedAccount) => {
      const {
        accessToken: _accessToken,
        refreshToken: _refreshToken,
        ...account
      } = storedAccount as StoredKnownAccount;
      return account;
    });
  } catch {
    return [];
  }
}

async function getAccountSecret(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(getAccountSecretKey(userId));
}

async function writeMetadata(accounts: readonly KnownAccount[]) {
  const metadata = accounts.map(
    ({ accessToken: _accessToken, refreshToken: _refreshToken, ...account }) => account,
  );
  await SecureStore.setItemAsync(
    KNOWN_ACCOUNTS_SECURE_STORE_KEY,
    JSON.stringify(metadata),
    SECURE_STORE_OPTIONS,
  );
}

async function migrateLegacyInlineTokens() {
  const rawValue = await SecureStore.getItemAsync(KNOWN_ACCOUNTS_SECURE_STORE_KEY);
  if (!rawValue) return;

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return;

    const accounts = parsed.filter(isValidAccount) as StoredKnownAccount[];
    const legacyAccounts = accounts.filter(
      (account) => account.accessToken || account.refreshToken,
    );
    if (legacyAccounts.length === 0) return;

    await Promise.all(
      legacyAccounts.map((account) => {
        if (!account.refreshToken) return Promise.resolve();
        return SecureStore.setItemAsync(
          getAccountSecretKey(account.userId),
          account.refreshToken,
          SECURE_STORE_OPTIONS,
        );
      }),
    );
    await writeMetadata(accounts);
  } catch {
    // Ignore malformed legacy metadata; ordinary reads safely return no accounts.
  }
}

function ensureLegacyInlineTokensMigrated() {
  legacyMigrationPromise ??= enqueueStorageOperation(migrateLegacyInlineTokens);
  return legacyMigrationPromise;
}

async function writeRaw(accounts: KnownAccount[]) {
  const trimmed = [...accounts]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, KNOWN_ACCOUNTS_LIMIT);

  await Promise.all(
    trimmed.map((account) => {
      if (!account.refreshToken) return Promise.resolve();
      return SecureStore.setItemAsync(
        getAccountSecretKey(account.userId),
        account.refreshToken,
        SECURE_STORE_OPTIONS,
      );
    }),
  );
  await Promise.all(
    accounts
      .filter((account) => !trimmed.some((saved) => saved.userId === account.userId))
      .map((account) => SecureStore.deleteItemAsync(getAccountSecretKey(account.userId))),
  );
  await writeMetadata(trimmed);
}

export async function listKnownAccounts(): Promise<KnownAccount[]> {
  await ensureLegacyInlineTokensMigrated();
  return enqueueStorageOperation(async () => {
    const accounts = await readAccountsMetadata();
    return accounts.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  });
}

export async function getKnownAccount(userId: string): Promise<KnownAccount | null> {
  await ensureLegacyInlineTokensMigrated();
  return enqueueStorageOperation(async () => {
    const account = (await readAccountsMetadata()).find((item) => item.userId === userId);
    if (!account) return null;
    return { ...account, accessToken: null, refreshToken: await getAccountSecret(userId) };
  });
}

export async function upsertKnownAccount(account: NativeKnownAccountInput) {
  await ensureLegacyInlineTokensMigrated();
  return enqueueStorageOperation(async () => {
    const metadata = await readAccountsMetadata();
    const existing = metadata.find((item) => item.userId === account.userId);
    const existingRefreshToken = existing ? await getAccountSecret(existing.userId) : null;

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
      accessToken: null,
      refreshToken:
        account.refreshToken !== undefined ? account.refreshToken : existingRefreshToken,
      expiresAt:
        account.expiresAt !== undefined ? account.expiresAt : (existing?.expiresAt ?? null),
      defaultAccent:
        account.defaultAccent !== undefined
          ? account.defaultAccent
          : (existing?.defaultAccent ?? null),
      themePreference:
        account.themePreference !== undefined
          ? account.themePreference
          : (existing?.themePreference ?? null),
    };

    const withoutExisting = metadata.filter((item) => item.userId !== account.userId);
    await writeRaw([...withoutExisting, next]);
  });
}

export async function removeKnownAccount(userId: string) {
  await ensureLegacyInlineTokensMigrated();
  return enqueueStorageOperation(async () => {
    const accounts = await readAccountsMetadata();
    const next = accounts.filter((item) => item.userId !== userId);

    if (next.length === accounts.length) return;
    await writeRaw(next);
    await SecureStore.deleteItemAsync(getAccountSecretKey(userId));
  });
}
