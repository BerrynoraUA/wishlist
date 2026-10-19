import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, type Query } from "@tanstack/react-query";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { createMMKV } from "react-native-mmkv";
import { deserializeQueryCache, serializeQueryCache } from "@/lib/query-cache-serialization";

/**
 * On-device copy of the TanStack Query cache, so screens the user loaded while online still
 * have data on the next launch without a connection. Writes queued offline are saved with it
 * (see `lib/offline-mutations.ts`).
 *
 * Kept in its own MMKV instance, apart from `preferencesStorage`: it is large, rewritten
 * often, and safe to drop at any time. Every query key carries the auth user id, and
 * `AuthProvider` clears the cache when the account changes, which also empties this copy.
 */
const queryCacheStorage = createMMKV({ id: "wishlist.query-cache" });

export const queryCachePersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => queryCacheStorage.getString(key) ?? null,
    setItem: (key, value) => {
      queryCacheStorage.set(key, value);
    },
    removeItem: (key) => {
      queryCacheStorage.remove(key);
    },
  },
  serialize: serializeQueryCache,
  deserialize: deserializeQueryCache,
});

/** How long saved data stays usable offline. Queries must be kept in memory at least as long. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

/**
 * Drops the saved cache whenever the JS bundle changes, so a new build or OTA update never
 * renders data shaped for the previous one.
 */
export const QUERY_CACHE_BUSTER = `${Application.nativeApplicationVersion ?? "dev"}:${
  Updates.updateId ?? "embedded"
}`;

export function shouldPersistQuery(query: Query) {
  // Search results are throwaway and keyed by whatever the user typed.
  const isSearch = query.queryKey[0] === "friends" && query.queryKey[1] === "search";
  return !isSearch && defaultShouldDehydrateQuery(query);
}
