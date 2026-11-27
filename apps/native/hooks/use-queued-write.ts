import { saveQueryCache } from "@/lib/query-persister";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { applyLocalWrite, findLocalRecord } from "@/lib/local-write-cache";
import { enqueueWrite, type QueuedWrite } from "@/lib/write-queue";

export function useQueuedWrite<TInput, TResult>(
  prepare: (
    input: TInput,
    userId: string,
    client: QueryClient,
  ) => Promise<QueuedWrite & { local: TResult }> | (QueuedWrite & { local: TResult }),
) {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    // This outer mutation only saves locally; the inner, persisted mutation does the I/O.
    networkMode: "always",
    meta: { offline: "local" },
    mutationFn: async (input: TInput): Promise<TResult> => {
      if (!user) throw new Error("Not authenticated");
      const write = await prepare(input, user.id, client);
      const savedWrite = { ...write, previous: findLocalRecord(client, write.entity, write.id) };
      const result = await enqueueWrite(client, savedWrite, (entry) =>
        applyLocalWrite(client, entry),
      );
      await saveQueryCache(client);
      return result;
    },
  });
}
