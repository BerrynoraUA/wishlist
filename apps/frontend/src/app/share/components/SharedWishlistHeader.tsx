"use client";

import styles from "../../wishlist/components/WishlistHeader.module.scss";
import { Gift, Calendar } from "lucide-react";
import { Wishlist } from "@/types/wishlist";
import { accentClass } from "@/lib/helpers/wishlist-helper";
import { visibilityLabel, visibilityIcon } from "@/lib/helpers/wishlist-helper";

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
  const hasImage = Boolean(wishlist.image_url);

  return (
    <div className={styles.header}>
      <div className={`${styles.banner} ${styles[accent]}`}>
        <div className={styles.bannerInner}>
          <div className={styles.heroLayout}>
            <div className={styles.heroMain}>
              <div className={styles.titleBlock}>
                <h1>{wishlist.title}</h1>
                {description && (
                  <p className={styles.description}>{description}</p>
                )}

                <div className={styles.badges}>
                  <span className={styles.visibilityBadge}>
                    {VisibilityIcon && <VisibilityIcon size={13} />}
                    {visibility}
                  </span>
                  <span className={styles.countBadge}>
                    {itemsCount} {itemsCount === 1 ? "item" : "items"}
                  </span>
                  {eventDate && (
                    <span className={styles.dateBadge}>
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

            <div className={styles.heroCenter}>
              <div className={styles.bannerIcon}>
                {hasImage ? (
                  <img
                    src={wishlist.image_url as string}
                    alt={wishlist.title}
                    className={styles.bannerIconImage}
                  />
                ) : (
                  <Gift size={28} />
                )}
              </div>
            </div>

            <div className={styles.heroAside} />
          </div>
        </div>
      </div>
    </div>
  );
}
