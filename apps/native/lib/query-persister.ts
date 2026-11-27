import { persistQueryClientSave } from "@tanstack/react-query-persist-client";
import type { QueryClient } from "@tanstack/react-query";
import { shouldPersistMutation } from "./offline-mutations";
import type { Persister } from "@tanstack/react-query-persist-client";
import { defaultShouldDehydrateQuery, type Query } from "@tanstack/react-query";
import { createMMKV } from "react-native-mmkv";
import { deserializeQueryCache, serializeQueryCache } from "@/lib/query-cache-serialization";

/**
 * On-device copy of the TanStack Query cache, so screens the user loaded while online still
 * have data on the next launch without a connection. Writes queued offline are saved with it
 * (see `lib/offline-mutations.ts`).
 *
 * Kept in its own MMKV instance, apart from `preferencesStorage`: it is large, rewritten
 * often, and includes unsynced writes that must be kept until sent or discarded. Every query key carries the auth user id, and
 * `AuthProvider` clears the cache when the account changes, which also empties this copy.
 */
const queryCacheStorage = createMMKV({ id: "wishlist.query-cache" });

const CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

// MMKV is synchronous. In particular, a save must finish before reporting an offline
// write as saved; a throttled async persister can resolve before the queued disk write.
export const queryCachePersister: Persister = {
  persistClient: (client) => {
    queryCacheStorage.set(CACHE_KEY, serializeQueryCache(client));
  },
  restoreClient: () => {
    const raw = queryCacheStorage.getString(CACHE_KEY);
    return raw ? deserializeQueryCache(raw) : undefined;
  },
  removeClient: () => {
    queryCacheStorage.remove(CACHE_KEY);
  },
};

/** Retain inactive queries for a week; unsynced writes and their saved cache do not expire. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

/** Version the persisted data shape; ordinary app updates must preserve unsent writes. */
export const QUERY_CACHE_BUSTER = "offline-writes-v1";

export function shouldPersistQuery(query: Query) {
  // Search results are throwaway and keyed by whatever the user typed.
  const isSearch = query.queryKey[0] === "friends" && query.queryKey[1] === "search";
  return !isSearch && defaultShouldDehydrateQuery(query);
}

/** Explicitly finish the local save before an offline form reports success. */
export function saveQueryCache(client: QueryClient) {
  return persistQueryClientSave({
    queryClient: client,
    persister: queryCachePersister,
    buster: QUERY_CACHE_BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery,
      shouldDehydrateMutation: shouldPersistMutation,
    },
  });
}
