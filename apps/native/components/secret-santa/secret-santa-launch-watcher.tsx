import { getUserNotifications, markNotificationAsRead } from "@/api/notifications";
import { getSecretSantaDetails } from "@/api/secret-santa";
import { SecretSantaLaunchCelebration } from "@/components/secret-santa/secret-santa-launch-celebration";
import { notificationKeys } from "@/hooks/use-notifications";
import { secretSantaKeys } from "@/hooks/use-secret-santa";
import { PREFERENCE_KEYS, preferencesStorage } from "@/lib/storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";
import * as React from "react";
import { AppState } from "react-native";

/** `notifications.type` for "the organizer drew names"; entity_id is the event. */
const SECRET_SANTA_STARTED_TYPE = 9;
/** Older draws are not worth a celebration (e.g. a fresh install on a new phone). */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REMEMBERED_EVENTS = 50;

function readCelebrated(userId: string): string[] {
  try {
    const raw = preferencesStorage.getString(PREFERENCE_KEYS.secretSantaCelebrated(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeCelebrated(userId: string, eventIds: string[]) {
  preferencesStorage.set(
    PREFERENCE_KEYS.secretSantaCelebrated(userId),
    JSON.stringify(eventIds.slice(-MAX_REMEMBERED_EVENTS)),
  );
}

/**
 * Plays the launch celebration for participants once the organizer draws names.
 *
 * The draw arrives as a type-9 notification, so this covers every way the user can learn about
 * it: the push lands while the app is open, the user taps the push, or they simply open the app
 * later. Each event is celebrated once per device; the organizer already saw it on launch.
 */
export function SecretSantaLaunchWatcher({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [celebrated, setCelebrated] = React.useState(() => readCelebrated(userId));
  const queryKey = React.useMemo(
    () => [...notificationKeys.all, "secret-santa-started", userId] as const,
    [userId],
  );

  const startedQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const notifications = await getUserNotifications({ limit: 30 });
      const cutoff = Date.now() - MAX_AGE_MS;
      return notifications.filter(
        (notification) =>
          notification.type === SECRET_SANTA_STARTED_TYPE &&
          notification.entity_id &&
          new Date(notification.created_at).getTime() >= cutoff,
      );
    },
    refetchInterval: 60_000,
  });

  React.useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      if (notification.request.content.data?.type === SECRET_SANTA_STARTED_TYPE) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      received.remove();
      appState.remove();
    };
  }, [queryClient, queryKey]);

  const pending = startedQuery.data?.find(
    (notification) => !celebrated.includes(notification.entity_id!),
  );
  const eventId = pending?.entity_id ?? "";
  const detailsQuery = useQuery({
    queryKey: secretSantaKeys.detail(userId, eventId),
    queryFn: () => getSecretSantaDetails(eventId),
    enabled: Boolean(eventId),
  });

  const markCelebrated = React.useCallback(
    (id: string) => {
      setCelebrated((current) => {
        if (current.includes(id)) return current;
        const next = [...current, id];
        writeCelebrated(userId, next);
        return next;
      });
    },
    [userId],
  );

  // A deleted event, lost access or a draw that was somehow undone: nothing to celebrate.
  const unusable =
    Boolean(eventId) &&
    (detailsQuery.isError || (detailsQuery.data != null && !detailsQuery.data.is_started));
  React.useEffect(() => {
    if (unusable) markCelebrated(eventId);
  }, [eventId, markCelebrated, unusable]);

  if (!pending || !detailsQuery.data?.is_started) return null;

  function handleClose() {
    if (!pending) return;

    markCelebrated(eventId);
    if (!pending.is_read) {
      void markNotificationAsRead(pending.id)
        .then(() => queryClient.invalidateQueries({ queryKey: notificationKeys.all }))
        .catch(() => undefined);
    }
    void queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });

    const eventRoute = `/secret-santa/${eventId}`;
    if (pathname !== eventRoute) router.push(eventRoute as never);
  }

  return (
    <SecretSantaLaunchCelebration
      key={eventId}
      receiver={detailsQuery.data.my_receiver}
      onClose={handleClose}
    />
  );
}
