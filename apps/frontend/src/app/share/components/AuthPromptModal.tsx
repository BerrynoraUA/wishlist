"use client";

import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import styles from "../../friends/components/FriendInviteModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  shareToken: string;
};

export function AuthPromptModal({ open, onClose, shareToken }: Props) {
  const router = useRouter();

  const handleSignIn = () => {
    const returnTo = `/share?token=${encodeURIComponent(shareToken)}&action=reserve`;
    router.push(`/login?redirect_to=${encodeURIComponent(returnTo)}`);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Sign in required</p>
        <h2 className={styles.cardTitle}>Want to reserve this gift?</h2>
        <p className={styles.cardText}>
          You need to sign in or create an account to reserve items. After
          signing in, a friend request will be sent to the wishlist owner
          automatically.
        </p>
        <Button onClick={handleSignIn}>Sign in</Button>
      </div>
    </Modal>
  );
}
