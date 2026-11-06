import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { OFFLINE_QUEUE_KEY, QUEUED_WRITE_OPTIONS, isLastQueuedWrite } from "./offline-mutations";

export const WRITE_QUEUE_KEY = [OFFLINE_QUEUE_KEY, "write"] as const;

export type QueuedWrite = {
  userId: string;
  entity: "wishlist" | "item" | "group" | "event" | "profile" | "settings" | "access";
  action: "create" | "update" | "delete";
  id: string;
  payload: unknown;
  local: unknown;
  previous?: unknown;
};

/** Register before hydration: restored mutations contain data, never executable functions. */
export function registerWriteQueue(
  client: QueryClient,
  send: (write: QueuedWrite) => Promise<unknown>,
) {
  client.setMutationDefaults(WRITE_QUEUE_KEY, {
    ...QUEUED_WRITE_OPTIONS,
    gcTime: Infinity,
    mutationFn: send,
    onSettled: () => {
      if (isLastQueuedWrite(client)) {
        // Refresh once the whole queue has settled, rather than between dependent writes.
        void client.invalidateQueries();
      }
    },
  });
}

/** Save locally first; a form must never wait for a connection to close. */
export async function enqueueWrite<T>(
  client: QueryClient,
  write: QueuedWrite & { local: T },
  apply: (write: QueuedWrite) => void,
) {
  await client.cancelQueries();
  apply(write);
  const wasWaiting =
    !onlineManager.isOnline() ||
    client.isMutating({
      predicate: (mutation) => mutation.options.mutationKey?.[0] === OFFLINE_QUEUE_KEY,
    }) > 0;
  const mutation = client.getMutationCache().build(client, { mutationKey: WRITE_QUEUE_KEY });
  const promise = mutation.execute(write);
  // Rejections stay in the cache for the sync notice, including after the form unmounts.
  void promise.catch(() => undefined);
  if (wasWaiting) return write.local;
  return (await promise) as T;
}

export function failedWrites(client: QueryClient) {
  return client
    .getMutationCache()
    .getAll()
    .filter(
      (mutation) =>
        mutation.options.mutationKey?.[0] === OFFLINE_QUEUE_KEY &&
        mutation.state.status === "error",
    );
}
