import { useMutationState } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { OFFLINE_QUEUE_KEY } from "@/lib/offline-mutations";
import type { QueuedWrite } from "@/lib/write-queue";
import { useGT } from "gt-react-native";

export function PendingSync({ id }: { id: string }) {
  const t = useGT();
  const pending = useMutationState({
    filters: {
      mutationKey: [OFFLINE_QUEUE_KEY, "write"],
      status: "pending",
      predicate: (mutation) => (mutation.state.variables as QueuedWrite)?.id === id,
    },
    select: () => true,
  });
  return pending.length ? (
    <Text className="text-xs font-semibold text-text-muted">{t("Waiting to sync")}</Text>
  ) : null;
}
