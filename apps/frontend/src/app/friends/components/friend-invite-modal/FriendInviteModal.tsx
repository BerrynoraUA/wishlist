"use client";

import { useEffect, useMemo, useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text, Eyebrow } from "@/components/ui/Typography";
import { useCheckFriendship, useSendFriendRequest } from "@/hooks/use-friends";
import { useCurrentUserId } from "@/hooks/use-user";
import styles from "./FriendInviteModal.module.scss";

type Status =
  | "checking"
  | "ready"
  | "missing"
  | "self"
  | "friends"
  | "sent"
  | "error"
  | "check_error"
  | "unauth";

type StatusInfo = {
  title: string;
  description: string;
  action?: string;
};

type Props = {
  open: boolean;
  userId: string;
  onClose: () => void;
};

export function FriendInviteModal({ open, userId, onClose }: Props) {
  const t = useGT();
  const [status, setStatus] = useState<Status>("checking");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { data: selfUserId = "", isLoading: isCurrentUserLoading } = useCurrentUserId();
  const canCheckFriendship = open && !!userId && !!selfUserId && userId !== selfUserId;
  const friendship = useCheckFriendship(canCheckFriendship ? userId : "");

  const sendRequest = useSendFriendRequest();

  const sendInvite = () => {
    if (!userId || !selfUserId) return;
    setErrorMessage("");

    sendRequest.mutate(userId, {
      onSuccess: () => setStatus("sent"),
      onError: (err) => {
        const message =
          err instanceof Error
            ? err.message
            : t("Could not send request.", {
                $id: "friends.inviteModal.sendErrorFallback",
              });
        setErrorMessage(message);
        setStatus("error");
      },
    });
  };

  useEffect(() => {
    if (!open) return;
    if (
      status === "sent" ||
      status === "error" ||
      status === "check_error" ||
      sendRequest.isPending
    )
      return;

    if (!userId) {
      setStatus("missing");
      return;
    }

    if (isCurrentUserLoading) {
      setStatus("checking");
      return;
    }

    if (!selfUserId) {
      setStatus("unauth");
      return;
    }

    if (userId === selfUserId) {
      setStatus("self");
      return;
    }

    if (friendship.isLoading) {
      setStatus("checking");
      return;
    }

    if (friendship.isError) {
      setStatus("check_error");
      setErrorMessage(
        t("Could not check friendship status.", {
          $id: "friends.inviteModal.checkErrorFallback",
        }),
      );
      return;
    }

    setErrorMessage("");
    setStatus(friendship.data ? "friends" : "ready");
  }, [
    friendship.data,
    friendship.isError,
    friendship.isLoading,
    isCurrentUserLoading,
    open,
    selfUserId,
    sendRequest.isPending,
    status,
    t,
    userId,
  ]);

  const statusInfo: Record<Status, StatusInfo> = useMemo(
    () => ({
      checking: {
        title: t("Checking invite...", {
          $id: "friends.inviteModal.checkingTitle",
        }),
        description: t("This may take a few seconds.", {
          $id: "friends.inviteModal.checkingDesc",
        }),
      },
      ready: {
        title: t("Send friend request?", {
          $id: "friends.inviteModal.readyTitle",
        }),
        description: t("Send a friend request to connect with this person.", {
          $id: "friends.inviteModal.readyDesc",
        }),
        action: t("Send request", { $id: "friends.inviteModal.sendRequest" }),
      },
      missing: {
        title: t("Missing userId", { $id: "friends.inviteModal.missingTitle" }),
        description: t("Invite link is missing a user identifier.", {
          $id: "friends.inviteModal.missingDesc",
        }),
        action: t("Back to friends", {
          $id: "friends.inviteModal.backToFriends",
        }),
      },
      self: {
        title: t("That's you", { $id: "friends.inviteModal.selfTitle" }),
        description: t("You can't send a friend request to yourself.", {
          $id: "friends.inviteModal.selfDesc",
        }),
        action: t("Back to friends", {
          $id: "friends.inviteModal.backToFriends",
        }),
      },
      friends: {
        title: t("You're already friends!", {
          $id: "friends.inviteModal.friendsTitle",
        }),
        description: t("This person is already in your friends list.", {
          $id: "friends.inviteModal.friendsDesc",
        }),
        action: t("Close", { $id: "friends.inviteModal.close" }),
      },
      sent: {
        title: t("Request sent", { $id: "friends.inviteModal.sentTitle" }),
        description: t("We'll notify you when they accept your invite.", {
          $id: "friends.inviteModal.sentDesc",
        }),
        action: t("Close", { $id: "friends.inviteModal.close" }),
      },
      error: {
        title: t("Couldn't send request", {
          $id: "friends.inviteModal.errorTitle",
        }),
        description:
          errorMessage ||
          t("Try again in a moment.", {
            $id: "friends.inviteModal.errorFallbackDesc",
          }),
        action: t("Try again", { $id: "friends.inviteModal.tryAgain" }),
      },
      check_error: {
        title: t("Couldn't check invite", {
          $id: "friends.inviteModal.checkErrorTitle",
        }),
        description:
          errorMessage ||
          t("Could not check friendship status.", {
            $id: "friends.inviteModal.checkErrorFallback",
          }),
        action: t("Close", { $id: "friends.inviteModal.close" }),
      },
      unauth: {
        title: t("Sign in required", {
          $id: "friends.inviteModal.unauthTitle",
        }),
        description: t("Please sign in to send a friend request.", {
          $id: "friends.inviteModal.unauthDesc",
        }),
        action: t("Close", { $id: "friends.inviteModal.close" }),
      },
    }),
    [t, errorMessage],
  );

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <Eyebrow tone="muted" className={styles.eyebrow}>
          {t("Friend request", { $id: "friends.inviteModal.eyebrow" })}
        </Eyebrow>
        <Heading className={styles.cardTitle}>{statusInfo[status].title}</Heading>
        <Text variant="caption" tone="secondary" className={styles.cardText}>
          {statusInfo[status].description}
        </Text>

        {(status === "checking" || sendRequest.isPending) && (
          <Text variant="caption" tone="muted" className={styles.loading}>
            {sendRequest.isPending
              ? t("Sending...", { $id: "friends.inviteModal.sending" })
              : t("Checking...", { $id: "friends.inviteModal.checking" })}
          </Text>
        )}

        {status === "ready" && (
          <Button onClick={sendInvite} disabled={sendRequest.isPending}>
            {statusInfo[status].action}
          </Button>
        )}

        {status === "error" && (
          <Button onClick={sendInvite} disabled={sendRequest.isPending}>
            {statusInfo[status].action}
          </Button>
        )}

        {status === "check_error" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "sent" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "missing" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "self" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "friends" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "unauth" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}
      </div>
    </Modal>
  );
}
