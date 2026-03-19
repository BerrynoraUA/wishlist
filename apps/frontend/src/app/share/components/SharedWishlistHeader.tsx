"use client";

import styles from "../../wishlist/components/WishlistHeader.module.scss";
import { Gift, Calendar } from "lucide-react";
import { Wishlist } from "@/types/wishlist";
import { accentClass } from "@/lib/helpers/wishlist-helper";
import { visibilityLabel, visibilityIcon } from "@/lib/helpers/wishlist-helper";
import infoStyles from "../../wishlist/components/WishlistInfo.module.scss";

type Props = {
  wishlist: Wishlist;
};

export function SharedWishlistHeader({ wishlist }: Props) {
  const accent = accentClass[wishlist.accent_type] ?? "pink";
  const visibility = visibilityLabel[wishlist.visibility_type] ?? "Private";
  const VisibilityIcon = visibilityIcon[wishlist.visibility_type];
  const itemsCount = wishlist.items_count ?? 0;
  const description = wishlist.description ?? "";
  const eventDate = wishlist.event_date;

  return (
    <div className={styles.header}>
      <div className={`${styles.banner} ${styles[accent]}`}>
        <div className={styles.bannerInner}>
          <div />
          <div className={styles.bannerIcon}>
            <Gift size={32} />
          </div>
          <div />
        </div>
      </div>

      <div className={infoStyles.info}>
        <div className={infoStyles.titleRow}>
          <div className={infoStyles.titleGroup}>
            <h1>{wishlist.title}</h1>
            {description && (
              <p className={infoStyles.description}>{description}</p>
            )}
          </div>
        </div>

        <div className={infoStyles.badges}>
          <span className={infoStyles.visibilityBadge}>
            {VisibilityIcon && <VisibilityIcon size={13} />}
            {visibility}
          </span>
          <span className={infoStyles.countBadge}>
            {itemsCount} {itemsCount === 1 ? "item" : "items"}
          </span>
          {eventDate && (
            <span className={infoStyles.dateBadge}>
              <Calendar size={13} />
              {new Date(eventDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
