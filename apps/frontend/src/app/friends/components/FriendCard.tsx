"use client";

import { useRouter } from "next/navigation";
import { useGT } from "gt-next";
import styles from "./FriendCard.module.scss";
import type { FriendWithDetails } from "@/api/types/friends";
import { UserMinus } from "lucide-react";

type Props = {
  friend: FriendWithDetails;
  onRemove?: (friendId: string) => void;
};

export function FriendCard({ friend, onRemove }: Props) {
  const t = useGT();
  const router = useRouter();

  return (
    <div
      className={styles.card}
      onClick={() => router.push(`/friends/${friend.friend_id}`)}
    >
      <div className={styles.avatar}>👤</div>

      <div className={styles.info}>
        <strong>{friend.display_name}</strong>
        {friend.nickname && <span>@{friend.nickname}</span>}
        <div className={styles.meta}>
          {t("{wishlistsCount} wishlists · {mutualCount} mutual", {
            wishlistsCount: friend.wishlists_count,
            mutualCount: friend.mutual_friends_count,
            $id: "friends.card.meta",
          })}
        </div>
      </div>

      <div className={styles.actions}>
        {onRemove && (
          <button
            className={`${styles.removeBtn} iconTooltipTrigger`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(friend.friend_id);
            }}
            aria-label={t("Remove friend", {
              $id: "friends.card.removeAria",
            })}
            data-tooltip={t("Remove friend", {
              $id: "friends.card.removeTooltip",
            })}
          >
            <UserMinus size={14} />
          </button>
        )}
        <div className={styles.arrow}>›</div>
      </div>
    </div>
  );
}
