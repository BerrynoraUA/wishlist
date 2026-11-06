import { QueryClient, hydrate } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryCachePersister, saveQueryCache } from "./query-persister";
import { WRITE_QUEUE_KEY, registerWriteQueue } from "./write-queue";

const { disk } = vi.hoisted(() => ({ disk: new Map<string, string>() }));
vi.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: (key: string) => disk.get(key),
    set: (key: string, value: string) => disk.set(key, value),
    remove: (key: string) => disk.delete(key),
  }),
}));
afterEach(() => disk.clear());

describe("offline disk persistence", () => {
  it("writes immediately and restores in-flight writes as resumable after a process restart", async () => {
    const original = new QueryClient();
    registerWriteQueue(original, () => new Promise(() => {}));
    const mutation = original.getMutationCache().build(original, { mutationKey: WRITE_QUEUE_KEY });
    void mutation.execute({
      id: "stable",
      userId: "me",
      entity: "wishlist",
      action: "create",
      payload: { title: "Saved" },
      local: { id: "stable" },
    });
    original.setQueryData(["wishlists", "my", "me"], {
      pages: [[{ id: "stable" }]],
      pageParams: [0],
    });
    await saveQueryCache(original);
    expect(disk.size).toBe(1);
    const saved = await queryCachePersister.restoreClient();
    const restored = new QueryClient();
    hydrate(restored, saved!.clientState);
    expect(restored.getMutationCache().getAll()[0].state).toMatchObject({
      status: "pending",
      isPaused: true,
      variables: { id: "stable" },
    });
    expect(restored.getQueryData(["wishlists", "my", "me"])).toMatchObject({
      pages: [[{ id: "stable" }]],
    });
    original.clear();
    restored.clear();
  });
});
