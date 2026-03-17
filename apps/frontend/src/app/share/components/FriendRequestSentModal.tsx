"use client";

import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import styles from "../../friends/components/FriendInviteModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FriendRequestSentModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Friend request</p>
        <h2 className={styles.cardTitle}>Request sent!</h2>
        <p className={styles.cardText}>
          A friend request has been sent to the wishlist owner. Once they
          accept, you&apos;ll be able to view and reserve items from their
          wishlists.
        </p>
        <Button onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  );
}
