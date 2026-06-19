import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useDeleteNotification } from "@/hooks/use-notifications";
import { useAcceptSecretSantaInvite, useDeclineSecretSantaInvite } from "@/hooks/use-secret-santa";
import type { Notification } from "@wishlist/backend/types";
import { useGT } from "gt-react-native";
import { Check, X } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

type InviteAction = "accept" | "decline";

export function SecretSantaInvitesPanel({ notifications }: { notifications: Notification[] }) {
  const t = useGT();
  const acceptInvite = useAcceptSecretSantaInvite();
  const declineInvite = useDeclineSecretSantaInvite();
  const deleteNotification = useDeleteNotification();
  const [pendingActions, setPendingActions] = React.useState<Record<string, InviteAction>>({});

  async function handleInviteAction(notification: Notification, action: InviteAction) {
    if (!notification.entity_id || pendingActions[notification.id]) return;

    setPendingActions((current) => ({ ...current, [notification.id]: action }));

    try {
      if (action === "accept") {
        await acceptInvite.mutateAsync(notification.entity_id);
      } else {
        await declineInvite.mutateAsync(notification.entity_id);
      }

      await deleteNotification.mutateAsync(notification.id);
    } finally {
      setPendingActions((current) => {
        const next = { ...current };
        delete next[notification.id];
        return next;
      });
    }
  }

  return (
    <View className="gap-3">
      {notifications.map((notification) => {
        const pendingAction = pendingActions[notification.id];
        const isAccepting = pendingAction === "accept";
        const isDeclining = pendingAction === "decline";
        const isPending = Boolean(pendingAction);

        return (
          <View
            key={notification.id}
            className="gap-3 rounded-xl border border-border-subtle bg-card-bg p-4 shadow-sm"
          >
            <View className="gap-1">
              <Text className="text-sm font-extrabold text-text">{t("Secret Santa invite")}</Text>
              <Text className="text-sm leading-5 text-text-muted">{notification.text}</Text>
              <Text className="text-xs font-semibold text-text-muted">
                {formatInviteTime(notification.created_at, t)}
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Button
                className="min-w-0 flex-1 rounded-full"
                size="sm"
                disabled={isPending}
                onPress={() => void handleInviteAction(notification, "accept")}
              >
                <Icon as={Check} className="size-4 text-primary-foreground" />
                <Text numberOfLines={1}>{isAccepting ? t("Accepting...") : t("Accept")}</Text>
              </Button>
              <Button
                className="min-w-0 flex-1 rounded-full"
                variant="secondary"
                size="sm"
                disabled={isPending}
                onPress={() => void handleInviteAction(notification, "decline")}
              >
                <Icon as={X} className="size-4 text-secondary-foreground" />
                <Text numberOfLines={1}>{isDeclining ? t("Declining...") : t("Decline")}</Text>
              </Button>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatInviteTime(
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
