import { onlineManager, type Mutation, type QueryClient } from "@tanstack/react-query";

/**
 * How mutations behave without a connection. There are three kinds:
 *
 * - Queued: their `mutationKey` starts with `OFFLINE_QUEUE_KEY`. They pause, are saved with
 *   the query cache (`lib/query-persister.ts`), and replay in order on reconnect, even after
 *   a restart. They need `setMutationDefaults`, since a restored mutation has only its key.
 * - Waiting: `meta: { offline: "wait" }`. They pause and run on reconnect if the app is
 *   still open. For background writes that already update the UI optimistically.
 * - Everything else fails right away with `OfflineError`, instead of spinning until the
 *   connection comes back.
 */
export const OFFLINE_QUEUE_KEY = "offline-queue";

/**
 * Shared by every queued write. One scope runs them serially, in the order they were made, so a
 * wish created inside a wishlist made offline is sent after that wishlist.
 */
export const QUEUED_WRITE_OPTIONS = { scope: { id: OFFLINE_QUEUE_KEY }, retry: 2 } as const;

// Just the fields read here, so any `Mutation` instantiation fits.
type AnyMutation = {
  options: Pick<Mutation["options"], "mutationKey" | "meta">;
  state: Pick<Mutation["state"], "isPaused"> & { status?: string };
};

export function isQueuedOfflineMutation(mutation: AnyMutation) {
  return mutation.options.mutationKey?.[0] === OFFLINE_QUEUE_KEY;
}

export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfflineError";
  }
}

let offlineErrorMessage = "You're offline. Try again once you're connected.";

/**
 * The QueryClient is created above `GTProvider`, so the translated message is handed in
 * from a component below it.
 */
export function setOfflineErrorMessage(message: string) {
  offlineErrorMessage = message;
}

/** `MutationCache` `onMutate`: throwing here fails the mutation before it pauses. */
export function rejectMutationWhileOffline(_variables: unknown, mutation: AnyMutation) {
  if (onlineManager.isOnline() || isQueuedOfflineMutation(mutation)) return;
  if (mutation.options.meta?.offline === "wait" || mutation.options.meta?.offline === "local")
    return;

  throw new OfflineError(offlineErrorMessage);
}

/** Keep pending and rejected queued writes until they sync or are discarded. */
export function shouldPersistMutation(mutation: AnyMutation) {
  return (
    isQueuedOfflineMutation(mutation) &&
    (mutation.state.isPaused ||
      mutation.state.status === "pending" ||
      mutation.state.status === "error")
  );
}

/** Queued writes not yet settled, including ones waiting for the connection. */
export function countQueuedWrites(queryClient: QueryClient) {
  return queryClient.isMutating({ predicate: isQueuedOfflineMutation });
}

/**
 * Whether the write settling now is the last one queued. A mutation still counts as pending
 * while its own `onSettled` runs, hence `<= 1`.
 */
export function isLastQueuedWrite(queryClient: QueryClient) {
  return countQueuedWrites(queryClient) <= 1;
}
