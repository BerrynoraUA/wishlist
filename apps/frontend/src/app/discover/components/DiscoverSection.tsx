"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import styles from "./DiscoverSection.module.scss";
import { DiscoverItemCard } from "./DiscoverItemCard";
import { DiscoverSection as Section } from "@/api/types/wishilst";

type Props = Section & {
  onToggleReserve?: (itemId: string) => void;
  onToggleBought?: (itemId: string) => void;
  avatarUrl?: string | null;
  showDiscountBadge?: boolean;
};

export function DiscoverSection({
  owner,
  username,
  avatar_url,
  wishlist,
  wishlist_id,
  date,
  friend_id,
  items,
  avatarUrl,
  onToggleReserve,
  onToggleBought,
  showDiscountBadge = false,
}: Props) {
  const itemCount = items.length;
  const resolvedAvatarUrl = avatarUrl ?? avatar_url ?? null;

  return (
    <section className={styles.section}>
      <header>
        <div className={styles.meta}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {resolvedAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedAvatarUrl}
                  alt=""
                  className={styles.avatarImg}
                />
              ) : (
                <UserRound size={16} />
              )}
            </span>

            <div className={styles.title}>
              <div className={styles.titleRow}>
                <span className={styles.owner}>{owner}</span>
                  <span className={styles.arrow} aria-hidden="true">&gt;</span>
                <span className={styles.wishlist}>{wishlist}</span>
              </div>

              <span className={styles.subline}>
                @{username}
                {date && ` · ${date}`}
              </span>
            </div>
          </div>
        </div>

        {wishlist_id ? (
          <Link href={`/wishlist/${wishlist_id}`} className={styles.viewAll}>
            View all {itemCount}
          </Link>
        ) : friend_id ? (
          <Link href={`/friends/${friend_id}`} className={styles.viewAll}>
            View all {itemCount}
          </Link>
        ) : (
          <span className={styles.viewAll}>View all ({itemCount})</span>
        )}
      </header>

      <div className={styles.grid}>
        {items.map((item) => (
          <DiscoverItemCard
            key={item.id}
            {...item}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
            onToggleBought={onToggleBought}
          />
        ))}
      </div>
    </section>
  );
}
