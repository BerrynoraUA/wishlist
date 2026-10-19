import { onlineManager, type Mutation } from "@tanstack/react-query";

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

// Just the fields read here, so any `Mutation` instantiation fits.
type AnyMutation = {
  options: Pick<Mutation["options"], "mutationKey" | "meta">;
  state: Pick<Mutation["state"], "isPaused">;
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
  if (mutation.options.meta?.offline === "wait") return;

  throw new OfflineError(offlineErrorMessage);
}

/** Only queued writes are saved: no other paused mutation could run after a restart. */
export function shouldPersistMutation(mutation: AnyMutation) {
  return mutation.state.isPaused && isQueuedOfflineMutation(mutation);
}
