"use client";

import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text, Eyebrow } from "@/components/ui/Typography";
import styles from "../../../friends/components/friend-invite-modal/FriendInviteModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FriendRequestSentModal({ open, onClose }: Props) {
  const t = useGT();
  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <Eyebrow tone="muted" className={styles.eyebrow}>
          {t("Friend request", { $id: "share.friendRequest.eyebrow" })}
        </Eyebrow>
        <Heading className={styles.cardTitle}>
          {t("Request sent!", { $id: "share.friendRequestSent.title" })}
        </Heading>
        <Text variant="caption" tone="secondary" className={styles.cardText}>
          {t(
            "A friend request has been sent to the wishlist owner. Once they accept, you'll be able to view and reserve items from their wishlists.",
            { $id: "share.friendRequestSent.body" },
          )}
        </Text>
        <Button onClick={onClose}>{t("Got it", { $id: "share.friendRequestSent.gotIt" })}</Button>
      </div>
    </Modal>
  );
}
