"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useSendFriendRequest } from "@/hooks/use-friends";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./FriendInviteModal.module.scss";

type Status = "idle" | "missing" | "self" | "sent" | "error" | "unauth";

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
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const selfIdRef = useRef<string>("");

  const sendRequest = useSendFriendRequest();

  const sendInvite = () => {
    if (!userId || !selfIdRef.current) return;
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

    let cancelled = false;
    setStatus("idle");
    setErrorMessage("");

    if (!userId) {
      setStatus("missing");
      return;
    }

    supabaseBrowser.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const id = data.user?.id ?? "";
        selfIdRef.current = id;

        if (!id) {
          setStatus("unauth");
        } else if (userId === id) {
          setStatus("self");
        } else {
          sendRequest.mutate(userId, {
            onSuccess: () => {
              if (!cancelled) setStatus("sent");
            },
            onError: (err) => {
              if (cancelled) return;
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
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("unauth");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const statusInfo: Record<Status, StatusInfo> = useMemo(
    () => ({
      idle: {
        title: t("Sending request...", {
          $id: "friends.inviteModal.idleTitle",
        }),
        description: t("This may take a few seconds.", {
          $id: "friends.inviteModal.idleDesc",
        }),
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
        <p className={styles.eyebrow}>
          {t("Friend request", { $id: "friends.inviteModal.eyebrow" })}
        </p>
        <h2 className={styles.cardTitle}>{statusInfo[status].title}</h2>
        <p className={styles.cardText}>{statusInfo[status].description}</p>

        {status === "idle" && sendRequest.isPending && (
          <p className={styles.loading}>
            {t("Sending...", { $id: "friends.inviteModal.sending" })}
          </p>
        )}

        {status === "error" && (
          <Button onClick={sendInvite} disabled={sendRequest.isPending}>
            {statusInfo[status].action}
          </Button>
        )}

        {status === "sent" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "missing" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "self" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}

        {status === "unauth" && <Button onClick={onClose}>{statusInfo[status].action}</Button>}
      </div>
    </Modal>
  );
}
