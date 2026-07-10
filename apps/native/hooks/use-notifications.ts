import {
  deactivateCurrentPushToken,
  deleteAllNotifications,
  deleteNotification,
  getUnreadNotificationsCount,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerPushToken,
  type GetNotificationsParams,
} from "@/api/notifications";
import { getNotificationPermissionPromptDecision } from "@/lib/notification-permission-prompt";
import { debugError, debugLog } from "@/lib/debug-log";
import { getSafeNotificationRoute } from "@/lib/notification-route";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as React from "react";

const NOTIFICATION_CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (authUserId: string | null | undefined, params?: GetNotificationsParams) =>
    [...notificationKeys.lists(), authUserId ?? "anonymous", params] as const,
  unread: (authUserId: string | null | undefined) =>
    [...notificationKeys.all, "unread", authUserId ?? "anonymous"] as const,
  unreadCount: (authUserId: string | null | undefined) =>
    [...notificationKeys.all, "unreadCount", authUserId ?? "anonymous"] as const,
};

function getExpoProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

function getPushUrlFromData(data: Notifications.NotificationContent["data"]) {
  return getSafeNotificationRoute(data?.url);
}

function getNotificationIdFromData(data: Notifications.NotificationContent["data"]) {
  const notificationId = data?.notificationId;
  return typeof notificationId === "string" ? notificationId : null;
}

async function ensureAndroidNotificationChannel() {
  if (process.env.EXPO_OS !== "android") return;

  debugLog("[push] ensuring Android notification channel");

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#208AEF",
  });
}

export async function getNotificationPermission() {
  return Notifications.getPermissionsAsync();
}

async function getGrantedNotificationStatus(requestPermission: boolean) {
  const existingPermission = await getNotificationPermission();
  debugLog("[push] checked notification permission");

  if (existingPermission.status === "granted") return existingPermission.status;
  if (!requestPermission || !existingPermission.canAskAgain) return existingPermission.status;

  const requestedPermission = await Notifications.requestPermissionsAsync();
  debugLog("[push] requested notification permission");

  return requestedPermission.status;
}

export async function registerPushNotifications({
  requestPermission,
}: {
  requestPermission: boolean;
}) {
  await ensureAndroidNotificationChannel();

  const finalStatus = await getGrantedNotificationStatus(requestPermission);
  if (finalStatus !== "granted") return false;

  const projectId = getExpoProjectId();
  if (!projectId) {
    debugError("[push] registration stopped: Expo projectId not found");
    return false;
  }

  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  await registerPushToken({
    expoPushToken,
    platform: process.env.EXPO_OS ?? "unknown",
  });

  return true;
}

export function useRegisterPushNotifications() {
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user?.id) {
      debugLog("[push] registration skipped: no authenticated user");
      return;
    }

    const userId = user.id;
    let cancelled = false;

    async function register() {
      debugLog("[push] registration started");

      const promptDecision = await getNotificationPermissionPromptDecision(userId);
      if (promptDecision !== "allowed") {
        debugLog("[push] registration deferred until notification prompt is accepted");
        return;
      }

      await registerPushNotifications({ requestPermission: false });
      if (!cancelled) debugLog("[push] registration check finished");
    }

    void register().catch((error) => {
      debugError("[push] registration failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);
}

export function useNotificationResponseObserver() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    function handleNotification(notification: Notifications.Notification) {
      const data = notification.request.content.data;
      const notificationId = getNotificationIdFromData(data);
      const url = getPushUrlFromData(data);

      if (notificationId) {
        void markNotificationAsRead(notificationId)
          .then(() => queryClient.invalidateQueries({ queryKey: notificationKeys.all }))
          .catch(() => undefined);
      }

      if (url) {
        router.push(url as never);
      }
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      handleNotification(lastResponse.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotification(response.notification);
    });

    return () => {
      subscription.remove();
    };
  }, [queryClient]);
}

export function useNotifications(params?: GetNotificationsParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list(user?.id, params),
    queryFn: () => getUserNotifications(params),
    enabled: Boolean(user?.id),
  });
}

export function useUnreadNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unread(user?.id),
    queryFn: () => getUserNotifications({ unread_only: true }),
    enabled: Boolean(user?.id),
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unreadCount(user?.id),
    queryFn: getUnreadNotificationsCount,
    enabled: Boolean(user?.id),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeactivateCurrentPushToken() {
  return useMutation({
    mutationFn: deactivateCurrentPushToken,
  });
}
