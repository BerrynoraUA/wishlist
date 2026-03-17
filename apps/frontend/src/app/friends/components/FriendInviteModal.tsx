"use client";

import { useEffect, useRef, useState } from "react";
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
          err instanceof Error ? err.message : "Не вдалося надіслати запит";
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
                  : "Не вдалося надіслати запит";
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

  const statusInfo: Record<Status, StatusInfo> = {
    idle: {
      title: "Sending request...",
      description: "This may take a few seconds.",
    },
    missing: {
      title: "Missing userId",
      description: "Invite link is missing a user identifier.",
      action: "Back to friends",
    },
    self: {
      title: "That’s you",
      description: "You can’t send a friend request to yourself.",
      action: "Back to friends",
    },
    sent: {
      title: "Request sent",
      description: "We’ll notify you when they accept your invite.",
      action: "Close",
    },
    error: {
      title: "Couldn’t send request",
      description: errorMessage || "Try again in a moment.",
      action: "Try again",
    },
    unauth: {
      title: "Sign in required",
      description: "Please sign in to send a friend request.",
      action: "Close",
    },
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Friend request</p>
        <h2 className={styles.cardTitle}>{statusInfo[status].title}</h2>
        <p className={styles.cardText}>{statusInfo[status].description}</p>

        {status === "idle" && sendRequest.isPending && (
          <p className={styles.loading}>Sending...</p>
        )}

        {status === "error" && (
          <Button onClick={sendInvite} disabled={sendRequest.isPending}>
            {statusInfo[status].action}
          </Button>
        )}

        {status === "sent" && (
          <Button onClick={onClose}>{statusInfo[status].action}</Button>
        )}

        {status === "missing" && (
          <Button onClick={onClose}>{statusInfo[status].action}</Button>
        )}

        {status === "self" && (
          <Button onClick={onClose}>{statusInfo[status].action}</Button>
        )}

        {status === "unauth" && (
          <Button onClick={onClose}>{statusInfo[status].action}</Button>
        )}
      </div>
    </Modal>
  );
}
