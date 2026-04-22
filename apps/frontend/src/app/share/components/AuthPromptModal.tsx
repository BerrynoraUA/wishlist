"use client";

import { useRouter } from "next/navigation";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text, Eyebrow } from "@/components/ui/Typography";
import styles from "../../friends/components/FriendInviteModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  shareToken: string;
  itemId?: string | null;
  page?: number;
};

export function AuthPromptModal({
  open,
  onClose,
  shareToken,
  itemId,
  page,
}: Props) {
  const t = useGT();
  const router = useRouter();

  const handleSignIn = () => {
    const params = new URLSearchParams({
      token: shareToken,
      action: "reserve",
    });

    if (itemId) {
      params.set("item", itemId);
    }

    if (page && page > 1) {
      params.set("page", String(page));
    }

    const returnTo = `/share?${params.toString()}`;
    router.push(`/login?redirect_to=${encodeURIComponent(returnTo)}`);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.card}>
        <Eyebrow tone="muted" className={styles.eyebrow}>
          {t("Sign in required", { $id: "share.authPrompt.eyebrow" })}
        </Eyebrow>
        <Heading className={styles.cardTitle}>
          {t("Want to reserve this gift?", { $id: "share.authPrompt.title" })}
        </Heading>
        <Text variant="caption" tone="secondary" className={styles.cardText}>
          {t(
            "You need to sign in or create an account to reserve items. After signing in, a friend request will be sent to the wishlist owner automatically.",
            { $id: "share.authPrompt.body" },
          )}
        </Text>
        <Button onClick={handleSignIn}>
          {t("Sign in", { $id: "share.authPrompt.signIn" })}
        </Button>
      </div>
    </Modal>
  );
}
