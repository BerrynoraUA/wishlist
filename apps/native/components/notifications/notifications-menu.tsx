import { MascotEmptyState } from "@/components/shared/mascot-empty-state";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/use-notifications";
import { useAcceptSecretSantaInvite, useDeclineSecretSantaInvite } from "@/hooks/use-secret-santa";
import { getSafeNotificationRoute } from "@/lib/notification-route";
import type { Notification } from "@wishlist/backend/types";
import { router } from "expo-router";
import { useGT } from "gt-react-native";
import { Bell, Check, Trash2, X } from "lucide-react-native";
import * as React from "react";
import { ActivityIndicator, Image, View } from "react-native";

type InviteAction = "accept" | "decline";
const DOUBLE_TAP_DELAY_MS = 320;

function getNotificationRoute(notification: Notification) {
  switch (notification.type) {
    case 0:
      return "/secret-santa";
    case 1:
    case 3:
    case 4:
    case 5:
    case 7:
    case 8:
      return notification.entity_id ? `/wishlists/${notification.entity_id}` : "/wishlists";
    case 2:
    case 6:
      return "/friends";
    default:
      return "/wishlists";
  }
}

function formatNotificationTime(
  createdAt: string,
  t: (message: string, options?: { n?: number }) => string,
) {
  const date = new Date(createdAt);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return t("Now");
  if (diffMinutes < 60) return t("{n}m", { n: diffMinutes });

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t("{n}h", { n: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t("{n}d ago", { n: diffDays });

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotificationsMenu() {
  const t = useGT();
  const [open, setOpen] = React.useState(false);
  const previousUnreadCountRef = React.useRef<number | null>(null);

  const { data: unreadCount = 0, isFetched: isUnreadCountFetched } = useUnreadNotificationsCount();
  const notificationsQuery = useNotifications({ limit: 20 });
  const notifications = notificationsQuery.data ?? [];
  const markAllRead = useMarkAllNotificationsAsRead();
  const deleteAll = useDeleteAllNotifications();
  const markRead = useMarkNotificationAsRead();
  const isBusy = notificationsQuery.isLoading || markAllRead.isPending || deleteAll.isPending;

  React.useEffect(() => {
    if (!isUnreadCountFetched) return;

    if (previousUnreadCountRef.current === null) {
      previousUnreadCountRef.current = unreadCount;
      return;
    }

    if (previousUnreadCountRef.current !== unreadCount) {
      previousUnreadCountRef.current = unreadCount;
      void notificationsQuery.refetch();
    }
  }, [isUnreadCountFetched, notificationsQuery, unreadCount]);

  async function handleReadAll() {
    await markAllRead.mutateAsync();
    await notificationsQuery.refetch();
  }

  async function handleClear() {
    await deleteAll.mutateAsync();
    await notificationsQuery.refetch();
  }

  async function handleMarkRead(id: string) {
    await markRead.mutateAsync(id);
    await notificationsQuery.refetch();
  }

  return (
    <>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t("Notifications")}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={() => setOpen(true)}
        className="size-11 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-card-bg shadow-[0px_8px_18px_rgba(15,23,42,0.18)]"
      >
        <Icon as={Bell} className="size-5 text-text" />
        {unreadCount > 0 ? (
          <View className="absolute -end-1 -top-1 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5">
            <Text className="text-[10px] font-extrabold leading-3 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </AnimatedPressable>

      <NotificationsSheet
        open={open}
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isBusy}
        onClear={() => void handleClear()}
        onReadAll={() => void handleReadAll()}
        onMarkRead={(id) => void handleMarkRead(id)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function NotificationsSheet({
  open,
  notifications,
  unreadCount,
  isLoading,
  onClear,
  onReadAll,
  onMarkRead,
  onClose,
}: {
  open: boolean;
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onClear: () => void;
  onReadAll: () => void;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!open) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      scrollable
      detents={[0.82, 1]}
      initialDetentIndex={0}
      onDidDismiss={onClose}
    >
      <View className="px-5 pb-6 pt-4">
        <View className="gap-4">
          <View className="gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-2xl font-extrabold text-text">{t("Notifications")}</Text>
                <Text className="text-sm leading-5 text-text-muted">
                  {unreadCount > 0
                    ? t("{n} unread notification", { n: unreadCount })
                    : t("You are all caught up.")}
                </Text>
              </View>
              <Button
                variant="ghost"
                size="icon-sm"
                accessibilityLabel={t("Close notifications")}
                onPress={() => void sheetRef.current?.dismiss()}
              >
                <Icon as={X} className="size-4 text-text" />
              </Button>
            </View>

            {notifications.length > 0 ? (
              <View className="flex-row gap-2">
                <Button
                  className="min-w-0 flex-1 rounded-full"
                  variant="secondary"
                  disabled={
                    isLoading || notifications.every((notification) => notification.is_read)
                  }
                  onPress={onReadAll}
                >
                  <Icon as={Check} className="size-4 text-secondary-foreground" />
                  <Text numberOfLines={1}>{t("Read all")}</Text>
                </Button>
                <Button
                  className="min-w-0 flex-1 rounded-full"
                  variant="outline"
                  disabled={isLoading}
                  onPress={onClear}
                >
                  <Icon as={Trash2} className="size-4 text-text" />
                  <Text numberOfLines={1}>{t("Clear")}</Text>
                </Button>
              </View>
            ) : null}
          </View>

          {isLoading ? (
            <NotificationsSkeleton />
          ) : notifications.length === 0 ? (
            <View className="rounded-2xl border border-border-subtle bg-card-bg py-6">
              <MascotEmptyState compact variant="sleeping-bell" message={t("No notifications")} />
            </View>
          ) : (
            <View className="gap-2.5">
              <Text className="px-1 text-xs font-extrabold uppercase text-text-light">
                {t("Recent")}
              </Text>
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onClose={onClose}
                  onMarkRead={onMarkRead}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

function NotificationsSkeleton() {
  return (
    <View className="gap-2.5">
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          className="flex-row gap-3 rounded-2xl border border-border-subtle bg-card-bg p-4"
        >
          <Skeleton className="mt-1 size-2 rounded-full" />
          <View className="min-w-0 flex-1 gap-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-9 w-full rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

function NotificationRow({
  notification,
  onClose,
  onMarkRead,
}: {
  notification: Notification;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}) {
  const t = useGT();
  const acceptInvite = useAcceptSecretSantaInvite();
  const declineInvite = useDeclineSecretSantaInvite();
  const deleteNotification = useDeleteNotification();
  const [pendingRead, setPendingRead] = React.useState(false);
  const [pendingInviteAction, setPendingInviteAction] = React.useState<InviteAction | null>(null);
  const lastTapAtRef = React.useRef(0);
  const isInvite = notification.type === 0 && notification.entity_id != null;

  async function markReadIfNeeded() {
    if (notification.is_read || pendingRead) return;

    setPendingRead(true);
    try {
      await onMarkRead(notification.id);
    } finally {
      setPendingRead(false);
    }
  }

  async function handlePress() {
    const now = Date.now();
    const isDoubleTap = now - lastTapAtRef.current <= DOUBLE_TAP_DELAY_MS;
    lastTapAtRef.current = now;

    await markReadIfNeeded();

    if (isDoubleTap) {
      const route = getSafeNotificationRoute(getNotificationRoute(notification));
      if (route) {
        router.push(route as never);
        onClose();
      }
    }
  }

  async function handleInviteAction(action: InviteAction) {
    if (!notification.entity_id || pendingInviteAction) return;

    setPendingInviteAction(action);
    try {
      if (action === "accept") {
        await acceptInvite.mutateAsync(notification.entity_id);
      } else {
        await declineInvite.mutateAsync(notification.entity_id);
      }
      await deleteNotification.mutateAsync(notification.id);
    } finally {
      setPendingInviteAction(null);
    }
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={notification.text}
      accessibilityHint={t("Double tap to open")}
      onPress={() => void handlePress()}
      className={
        notification.is_read
          ? "gap-3 rounded-2xl border border-border-subtle bg-card-bg p-4"
          : "gap-3 rounded-2xl border border-brand/25 bg-brand-lighter p-4"
      }
    >
      <View className="flex-row gap-3">
        {notification.type === 0 ? (
          <Image
            source={require("@/assets/images/secret-santa-tab.png")}
            className="size-6"
            tintColorClassName={notification.is_read ? "accent-text-muted" : "accent-brand"}
          />
        ) : (
          <View
            className={
              notification.is_read
                ? "mt-1.5 size-2 rounded-full bg-border"
                : "mt-1.5 size-2 rounded-full bg-brand"
            }
          />
        )}
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-bold leading-5 text-text">{notification.text}</Text>
          <Text className="text-xs font-semibold text-text-muted">
            {formatNotificationTime(notification.created_at, t)}
          </Text>
        </View>
      </View>

      {isInvite ? (
        <View className="ms-5 flex-row gap-2">
          <Button
            className="min-w-0 flex-1 rounded-full"
            size="sm"
            disabled={Boolean(pendingInviteAction)}
            onPress={() => void handleInviteAction("accept")}
          >
            {pendingInviteAction === "accept" ? (
              <ActivityIndicator colorClassName="accent-primary-foreground" />
            ) : (
              <Icon as={Check} className="size-4 text-primary-foreground" />
            )}
            <Text numberOfLines={1}>
              {pendingInviteAction === "accept" ? t("Accepting...") : t("Accept")}
            </Text>
          </Button>
          <Button
            className="min-w-0 flex-1 rounded-full"
            variant="secondary"
            size="sm"
            disabled={Boolean(pendingInviteAction)}
            onPress={() => void handleInviteAction("decline")}
          >
            {pendingInviteAction === "decline" ? (
              <ActivityIndicator colorClassName="accent-secondary-foreground" />
            ) : (
              <Icon as={X} className="size-4 text-secondary-foreground" />
            )}
            <Text numberOfLines={1}>
              {pendingInviteAction === "decline" ? t("Declining...") : t("Decline")}
            </Text>
          </Button>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}
