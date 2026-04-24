"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text, Eyebrow } from "@/components/ui/Typography";
import styles from "../../../friends/components/friend-invite-modal/FriendInviteModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  status: "sent" | "already_friends" | "error";
};

export function FriendRequestStatusModal({ open, onClose, status }: Props) {
  const t = useGT();

  const info = useMemo(
    (): Record<Props["status"], { title: string; description: string }> => ({
      sent: {
        title: t("Friend request sent", {
          $id: "share.friendRequestStatus.sentTitle",
        }),
        description: t(
          "We've sent a friend request to the wishlist owner. Once accepted, you'll be able to reserve items.",
          { $id: "share.friendRequestStatus.sentBody" },
        ),
      },
      already_friends: {
        title: t("You're already friends!", {
          $id: "share.friendRequestStatus.friendsTitle",
        }),
        description: t("You can now reserve items from this wishlist.", {
          $id: "share.friendRequestStatus.friendsBody",
        }),
      },
      error: {
        title: t("Something went wrong", {
          $id: "share.friendRequestStatus.errorTitle",
        }),
        description: t("We couldn't send the friend request. Please try again later.", {
          $id: "share.friendRequestStatus.errorBody",
        }),
      },
    }),
    [t],
  );

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <Eyebrow tone="muted" className={styles.eyebrow}>
          {t("Friend request", { $id: "share.friendRequest.eyebrow" })}
        </Eyebrow>
        <Heading className={styles.cardTitle}>{info[status].title}</Heading>
        <Text variant="caption" tone="secondary" className={styles.cardText}>
          {info[status].description}
        </Text>
        <Button onClick={onClose}>{t("Close", { $id: "common.close" })}</Button>
      </div>
    </Modal>
  );
}
