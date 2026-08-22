"use client";

import { useGT } from "gt-next";
import { UserCheck } from "lucide-react";
import type { BlockedUser } from "@/api/types/friends";
import styles from "./BlockedUserCard.module.scss";

type Props = {
  user: BlockedUser;
  onUnblock: (userId: string) => void;
  isPending?: boolean;
};

export function BlockedUserCard({ user, onUnblock, isPending = false }: Props) {
  const t = useGT();

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>👤</div>

      <div className={styles.info}>
        <strong>
          {user.display_name ??
            user.nickname ??
            t("Unknown user", { $id: "friends.blocked.unknownUser" })}
        </strong>
        {user.nickname && <span>@{user.nickname}</span>}
        <div className={styles.meta}>
          {t("Blocked — cannot send you requests or see your wishlists", {
            $id: "friends.blocked.cardMeta",
          })}
        </div>
      </div>

      <button
        type="button"
        className={styles.unblockBtn}
        onClick={() => onUnblock(user.id)}
        disabled={isPending}
      >
        <UserCheck size={14} />
        {t("Unblock", { $id: "friends.blocked.unblock" })}
      </button>
    </div>
  );
}
