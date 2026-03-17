"use client";

import { useRouter } from "next/navigation";
import styles from "./FriendCard.module.scss";
import type { FriendWithDetails } from "@/api/types/friends";
import { UserMinus } from "lucide-react";

type Props = {
  friend: FriendWithDetails;
  onRemove?: (friendId: string) => void;
};

export function FriendCard({ friend, onRemove }: Props) {
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
          {friend.wishlists_count} wishlists · {friend.mutual_friends_count}{" "}
          mutual
        </div>
      </div>

      <div className={styles.actions}>
        {onRemove && (
          <button
            className={styles.removeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(friend.friend_id);
            }}
            title="Remove friend"
          >
            <UserMinus size={14} />
          </button>
        )}
        <div className={styles.arrow}>›</div>
      </div>
    </div>
  );
}
