import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dehydrate,
  hydrate,
  MutationCache,
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";
import {
  enqueueWrite,
  failedWrites,
  registerWriteQueue,
  WRITE_QUEUE_KEY,
  type QueuedWrite,
} from "./write-queue";
import { rejectMutationWhileOffline, shouldPersistMutation } from "./offline-mutations";
import { applyLocalWrite, reapplyPendingWrites } from "./local-write-cache";
import { deserializeQueryCache, serializeQueryCache } from "./query-cache-serialization";

const clients: QueryClient[] = [];
function client(send = vi.fn(async (write: QueuedWrite) => write.local)) {
  const result = new QueryClient({
    mutationCache: new MutationCache({ onMutate: rejectMutationWhileOffline }),
  });
  registerWriteQueue(result, send);
  clients.push(result);
  return result;
}
function write(id: string, entity: QueuedWrite["entity"] = "wishlist"): QueuedWrite {
  return {
    userId: "user",
    entity,
    action: "create",
    id,
    payload: { title: id },
    local: { id, title: id, user_id: "user" },
  };
}
afterEach(() => {
  clients.forEach((entry) => entry.clear());
  clients.length = 0;
  onlineManager.setOnline(true);
});

describe("durable write queue", () => {
  it("returns local records offline and replays parent before child after a serialized restart", async () => {
    onlineManager.setOnline(false);
    const send = vi.fn(async (entry: QueuedWrite) => entry.local);
    const original = client(send);
    const parent = write("parent");
    const child = { ...write("child", "item"), local: { id: "child", wishlist_id: "parent" } };
    await expect(
      enqueueWrite(original, parent, (entry) => applyLocalWrite(original, entry)),
    ).resolves.toEqual(parent.local);
    await enqueueWrite(original, child, (entry) => applyLocalWrite(original, entry));
    expect(send).not.toHaveBeenCalled();
    const saved = serializeQueryCache(
      dehydrate(original, { shouldDehydrateMutation: shouldPersistMutation }),
    );
    const restored = client(send);
    hydrate(restored, deserializeQueryCache(saved));
    expect(restored.getQueryData(["wishlists", "detail", "parent", "user"])).toMatchObject(
      parent.local as object,
    );
    onlineManager.setOnline(true);
    await restored.resumePausedMutations();
    expect(send.mock.calls.map(([entry]) => entry.id)).toEqual(["parent", "child"]);
  });

  it("keeps an in-flight write when killed online and replays it after restart", async () => {
    const original = client(vi.fn(() => new Promise(() => {})));
    const entry = write("online");
    void enqueueWrite(original, entry, () => {});
    await vi.waitFor(() => expect(original.isMutating()).toBe(1));
    const saved = deserializeQueryCache<ReturnType<typeof dehydrate>>(
      serializeQueryCache(dehydrate(original, { shouldDehydrateMutation: shouldPersistMutation })),
    );
    expect(saved.mutations).toHaveLength(1);
    const send = vi.fn(async (value: QueuedWrite) => value.local);
    const restored = client(send);
    hydrate(restored, saved);
    await restored.resumePausedMutations();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retains rejected inputs and their error across restart, then allows retry", async () => {
    const original = client(
      vi.fn(async () => {
        throw new Error("Plan limit reached");
      }),
    );
    original.setMutationDefaults(WRITE_QUEUE_KEY, {
      ...original.getMutationDefaults(WRITE_QUEUE_KEY),
      retry: false,
    });
    await expect(enqueueWrite(original, write("rejected"), () => {})).rejects.toThrow(
      "Plan limit reached",
    );
    const saved = serializeQueryCache(
      dehydrate(original, { shouldDehydrateMutation: shouldPersistMutation }),
    );
    const restored = client();
    hydrate(restored, deserializeQueryCache(saved));
    const [failed] = failedWrites(restored);
    expect(failed.state.error?.message).toBe("Plan limit reached");
    expect((failed.state.variables as QueuedWrite).id).toBe("rejected");
    await failed.execute(failed.state.variables);
    expect(failedWrites(restored)).toHaveLength(0);
  });

  it("refreshes only after the final queued write", async () => {
    onlineManager.setOnline(false);
    const current = client();
    const invalidate = vi.spyOn(current, "invalidateQueries");
    await enqueueWrite(current, write("first"), () => {});
    await enqueueWrite(current, write("second"), () => {});
    onlineManager.setOnline(true);
    await current.resumePausedMutations();
    await vi.waitFor(() => expect(current.isMutating()).toBe(0));
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("preserves a later edit when a reconnect fetch returns an older record", async () => {
    onlineManager.setOnline(false);
    const current = client();
    const entry = write("one");
    current.setQueryData(["wishlists", "my", "user"], { pages: [[entry.local]], pageParams: [0] });
    await enqueueWrite(
      current,
      {
        ...entry,
        action: "update",
        local: { ...(entry.local as object), title: "Edited offline" },
      },
      (value) => applyLocalWrite(current, value),
    );
    current.setQueryData(["wishlists", "my", "user"], { pages: [[entry.local]], pageParams: [0] });
    reapplyPendingWrites(current);
    expect(current.getQueryData(["wishlists", "my", "user"])).toMatchObject({
      pages: [[{ title: "Edited offline" }]],
    });
  });
});
