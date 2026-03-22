"use client";

import { useRouter } from "next/navigation";
import styles from "./WishlistCard.module.scss";
import { Wishlist } from "@/types/wishlist";
import { Gift, Link2 } from "lucide-react";
import {
  accentClass,
  visibilityIcon,
  visibilityLabel,
} from "@/lib/helpers/wishlist-helper";

type Props = {
  wishlist: Wishlist;
  showSharedMeta?: boolean;
};

export function WishlistCard({ wishlist, showSharedMeta = true }: Props) {
  const router = useRouter();

  const accent = accentClass[wishlist.accent_type] ?? "pink";
  const hasImage = Boolean(wishlist.image_url);
  const visibility = wishlist.visibility_type;
  const VisibilityIcon = visibilityIcon[visibility];
  const itemsCount =
    wishlist.items_count ??
    (wishlist as Wishlist & { itemsCount?: number }).itemsCount ??
    0;
  const isShared = showSharedMeta && wishlist.is_owner === false;
  const ownerNickname = wishlist.owner_nickname?.trim();
  const sharedTooltip = ownerNickname
    ? `Shared by @${ownerNickname}`
    : "Shared wishlist";

  return (
    <div
      className={styles.card}
      onClick={() => router.push(`/wishlist/${wishlist.id}`)}
      style={{ cursor: "pointer" }}
    >
      <div className={`${styles.top} ${styles[accent]}`}>
        {hasImage && (
          <img
            src={wishlist.image_url as string}
            alt={wishlist.title}
            className={styles.coverImage}
          />
        )}
        {isShared && (
          <div
            className={styles.sharedBadge}
            aria-label={sharedTooltip}
            title={sharedTooltip}
          >
            <Link2 size={12} />
            <span>Shared</span>
            <span className={styles.sharedTooltip} role="tooltip">
              {sharedTooltip}
            </span>
          </div>
        )}
        {!hasImage && <Gift size={40} className={styles.icon} />}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{wishlist.title}</h3>

        <div className={styles.meta}>
          <span className={styles.items}>{itemsCount} items</span>

          <span className={styles.visibility}>
            <VisibilityIcon size={14} />
            {visibilityLabel[visibility]}
          </span>
        </div>
      </div>
    </div>
  );
}
