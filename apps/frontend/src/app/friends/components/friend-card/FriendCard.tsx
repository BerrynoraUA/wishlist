"use client";

import Link from "next/link";
import { useGT } from "gt-next";
import styles from "./FriendCard.module.scss";
import type { FriendWithDetails } from "@/api/types/friends";
import { UserMinus, UserRound } from "lucide-react";

type Props = {
  friend: FriendWithDetails;
  onRemove?: (friendId: string) => void;
};

export function FriendCard({ friend, onRemove }: Props) {
  const t = useGT();

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        {friend.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={friend.avatar_url} alt="" className={styles.avatarImg} />
        ) : (
          <UserRound size={18} />
        )}
      </div>

      <div className={styles.info}>
        <strong>
          {/* Stretched over the whole card, so the card opens like a link and is reachable by Tab. */}
          <Link href={`/friends/${friend.friend_id}`} className={styles.cardLink}>
            {friend.display_name}
          </Link>
        </strong>
        {friend.nickname && <span>@{friend.nickname}</span>}
        <div className={styles.meta}>
          {friend.wishlists_count === 1
            ? t("{wishlistsCount} wishlist · {mutualCount} mutual", {
                wishlistsCount: friend.wishlists_count,
                mutualCount: friend.mutual_friends_count,
                $id: "friends.card.meta.one",
              })
            : t("{wishlistsCount} wishlists · {mutualCount} mutual", {
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
