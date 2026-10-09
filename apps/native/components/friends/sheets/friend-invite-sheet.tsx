import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomSheet, BottomSheetHeader, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useCheckFriendship, useProfilesByIds, useSendFriendRequest } from "@/hooks/use-friends";
import { useCurrentUserId } from "@/hooks/use-user";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import { UserPlus } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

type Status = "checking" | "ready" | "self" | "friends" | "sent" | "error";

/**
 * Opened from a friend invite link (`?friendInvite=<userId>`), the app's counterpart of the
 * web FriendInviteModal: shows who invited you and sends them a friend request.
 */
export function FriendInviteSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const t = useGT();
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { data: selfUserId = "", isLoading: isSelfLoading } = useCurrentUserId();
  const isSelf = Boolean(selfUserId) && selfUserId === userId;
  const profileQuery = useProfilesByIds(userId ? [userId] : []);
  const friendship = useCheckFriendship(selfUserId && !isSelf ? userId : "");
  const sendRequest = useSendFriendRequest();
  const [sent, setSent] = React.useState(false);

  const profile = profileQuery.data?.[0];
  const name = profile?.display_name || profile?.nickname || t("Wishlane user");

  const status: Status = sent
    ? "sent"
    : sendRequest.isError
      ? "error"
      : isSelfLoading || profileQuery.isLoading || friendship.isLoading
        ? "checking"
        : isSelf
          ? "self"
          : friendship.data
            ? "friends"
            : "ready";

  const description = {
    checking: t("Checking invite..."),
    ready: t("Send a friend request to connect and see each other's wishlists."),
    self: t("This is your own invite link."),
    friends: t("You're already friends!"),
    sent: t("Request sent. We'll let you know when they accept."),
    error: sendRequest.error?.message ?? t("Could not send request."),
  }[status];

  function close() {
    void sheetRef.current?.dismiss();
  }

  function send() {
    sendRequest.mutate(userId, {
      onSuccess: () => {
        hapticSuccess();
        setSent(true);
      },
      onError: hapticError,
    });
  }

  const canSend = status === "ready" || status === "error";

  return (
    <BottomSheet
      ref={sheetRef}
      detents={["auto"]}
      onDidDismiss={onClose}
      header={<BottomSheetHeader title={t("Friend request")} />}
      footer={
        <View className="w-full flex-row gap-2 border-t border-border-subtle bg-bg-elevated px-5 pt-3">
          {canSend ? (
            <>
              <Button
                className="min-w-0 flex-1"
                variant="outline"
                disabled={sendRequest.isPending}
                onPress={close}
              >
                <Text>{t("Cancel")}</Text>
              </Button>
              <Button className="min-w-0 flex-1" disabled={sendRequest.isPending} onPress={send}>
                {sendRequest.isPending ? (
                  <ActivityIndicator colorClassName="accent-primary-foreground" />
                ) : (
                  <Icon as={UserPlus} className="size-4 text-primary-foreground" />
                )}
                <Text numberOfLines={1}>
                  {status === "error" ? t("Try again") : t("Send request")}
                </Text>
              </Button>
            </>
          ) : (
            <Button className="min-w-0 flex-1" variant="outline" onPress={close}>
              <Text>{t("Close")}</Text>
            </Button>
          )}
        </View>
      }
    >
      <View className="items-center gap-3 px-5 pt-1">
        {status === "checking" ? (
          <View className="h-20 items-center justify-center">
            <ActivityIndicator colorClassName="accent-brand" />
          </View>
        ) : (
          <>
            <Avatar className="size-20" alt={name}>
              {profile?.avatar_url ? <AvatarImage source={{ uri: profile.avatar_url }} /> : null}
              <AvatarFallback
                className="bg-brand-lighter"
                initialsClassName="text-2xl text-brand"
              />
            </Avatar>
            <View className="items-center gap-0.5">
              <Text className="text-center text-xl font-extrabold text-text" numberOfLines={2}>
                {name}
              </Text>
              {profile?.nickname ? (
                <Text className="text-sm text-text-muted">@{profile.nickname}</Text>
              ) : null}
            </View>
          </>
        )}
        <Text
          className={
            status === "error"
              ? "text-center text-sm font-semibold text-destructive"
              : "text-center text-sm leading-5 text-text-muted"
          }
        >
          {description}
        </Text>
      </View>
    </BottomSheet>
  );
}
