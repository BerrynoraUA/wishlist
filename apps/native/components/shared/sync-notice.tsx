import { useMutationState, useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, View } from "react-native";
import { useGT } from "gt-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { OFFLINE_QUEUE_KEY } from "@/lib/offline-mutations";
import { failedWrites, type QueuedWrite } from "@/lib/write-queue";
import { applyLocalWrite, discardLocalWrite } from "@/lib/local-write-cache";
import { saveQueryCache } from "@/lib/query-persister";
import { NAV_TAB_BAR_HEIGHT } from "@/lib/layout";

/** Failed inputs stay saved until the user retries or explicitly discards them. */
export function SyncNotice() {
  const client = useQueryClient();
  const t = useGT();
  const insets = useSafeAreaInsets();
  const failures = useMutationState({
    filters: { mutationKey: [OFFLINE_QUEUE_KEY], status: "error" },
    select: (mutation) => mutation.mutationId,
  });
  const pending = useMutationState({
    filters: { mutationKey: [OFFLINE_QUEUE_KEY, "write"], status: "pending" },
    select: (mutation) => (mutation.state.variables as QueuedWrite)?.entity,
  });
  if (
    !failures.length &&
    !pending.some((entity) => entity === "profile" || entity === "settings" || entity === "access")
  )
    return null;

  function reviewFailure() {
    const mutation = failedWrites(client)[0];
    if (!mutation) return;
    const write = mutation.state.variables as QueuedWrite;
    const message =
      describeSyncError(mutation.state.error) ??
      t(
        "The server could not save this change. It may have been deleted, or you may no longer have access.",
      );
    Alert.alert(t("Change couldn't be saved"), message, [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Discard"),
        style: "destructive",
        onPress: () => {
          client.getMutationCache().remove(mutation);
          if (write?.entity) discardLocalWrite(client, write);
          void client.invalidateQueries();
          void saveQueryCache(client);
        },
      },
      {
        text: t("Retry"),
        onPress: () => {
          if (write?.entity) applyLocalWrite(client, write);
          void mutation.execute(mutation.state.variables).catch(() => undefined);
        },
      },
    ]);
  }

  return (
    <View
      className="absolute inset-x-0 items-center px-4"
      pointerEvents="box-none"
      style={{ bottom: Math.max(insets.bottom, 8) + NAV_TAB_BAR_HEIGHT + 52 }}
    >
      <Pressable
        accessibilityRole={failures.length ? "button" : "text"}
        disabled={!failures.length}
        onPress={reviewFailure}
        className="rounded-xl border border-border-subtle bg-card-bg px-4 py-3"
      >
        <Text
          className={
            failures.length
              ? "text-sm font-semibold text-destructive"
              : "text-sm font-semibold text-text-muted"
          }
        >
          {failures.length === 1
            ? t("1 change couldn't be saved. Tap to review.")
            : failures.length
              ? t("{count} changes couldn't be saved. Tap to review.", { count: failures.length })
              : t("Waiting to sync")}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The reason to show for a rejected write, or `null` for a generic one. Messages the app or a
 * database function raised for people (`P0001`) are shown; other database errors, such as an
 * access policy refusing a row whose wishlist was deleted elsewhere, mean nothing to them.
 */
function describeSyncError(error: unknown) {
  if (!(error instanceof Object) || !("message" in error) || typeof error.message !== "string") {
    return null;
  }
  if ("code" in error && error.code && error.code !== "P0001") return null;
  return error.message || null;
}
