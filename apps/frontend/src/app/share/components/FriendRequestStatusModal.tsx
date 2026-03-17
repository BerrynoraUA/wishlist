"use client";

import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import styles from "../../friends/components/FriendInviteModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  status: "sent" | "already_friends" | "error";
};

const info: Record<Props["status"], { title: string; description: string }> = {
  sent: {
    title: "Friend request sent",
    description:
      "We've sent a friend request to the wishlist owner. Once accepted, you'll be able to reserve items.",
  },
  already_friends: {
    title: "You're already friends!",
    description: "You can now reserve items from this wishlist.",
  },
  error: {
    title: "Something went wrong",
    description: "We couldn't send the friend request. Please try again later.",
  },
};

export function FriendRequestStatusModal({ open, onClose, status }: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Friend request</p>
        <h2 className={styles.cardTitle}>{info[status].title}</h2>
        <p className={styles.cardText}>{info[status].description}</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
