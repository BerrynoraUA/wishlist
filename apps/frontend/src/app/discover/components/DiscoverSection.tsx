"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGT } from "gt-next";
import { UserRound } from "lucide-react";
import styles from "./DiscoverSection.module.scss";
import { ItemCard, normalizeDiscoverItem } from "@/components/shared/ItemCard";
import { ItemDetailModal } from "./ItemDetailModal";
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
  const t = useGT();
  const router = useRouter();
  const itemCount = items.length;
  const resolvedAvatarUrl = avatarUrl ?? avatar_url ?? null;

  return (
    <section className={styles.section}>
      <header>
        <div className={styles.meta}>
          <div className={styles.identity}>
            <span
              className={`${styles.avatar} ${friend_id ? styles.avatarClickable : ""}`}
              role={friend_id ? "link" : undefined}
              aria-label={friend_id ? owner : undefined}
              onClick={() => {
                if (friend_id) {
                  router.push(`/friends/${friend_id}`);
                }
              }}
            >
              {resolvedAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolvedAvatarUrl} alt="" className={styles.avatarImg} />
              ) : (
                <UserRound size={16} />
              )}
            </span>

            <div className={styles.title}>
              <div className={styles.titleRow}>
                {friend_id ? (
                  <Link href={`/friends/${friend_id}`} className={styles.ownerLink}>
                    {owner}
                  </Link>
                ) : (
                  <span className={styles.owner}>{owner}</span>
                )}
                <span className={styles.arrow} aria-hidden="true">
                  &gt;
                </span>
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
            {t("View all {count}", {
              count: itemCount,
              $id: "discover.section.viewAll",
            })}
          </Link>
        ) : friend_id ? (
          <Link href={`/friends/${friend_id}`} className={styles.viewAll}>
            {t("View all {count}", {
              count: itemCount,
              $id: "discover.section.viewAll",
            })}
          </Link>
        ) : (
          <span className={styles.viewAll}>
            {t("View all ({count})", {
              count: itemCount,
              $id: "discover.section.viewAllParen",
            })}
          </span>
        )}
      </header>

      <div className={styles.grid}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            {...normalizeDiscoverItem(item)}
            variant="discover"
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
            onToggleBought={onToggleBought}
            renderDetailModal={({ open, onClose }) => (
              <ItemDetailModal
                open={open}
                onClose={onClose}
                item={item}
                onToggleReserve={onToggleReserve}
                onToggleBought={onToggleBought}
              />
            )}
          />
        ))}
      </div>
    </section>
  );
}
