"use client";

import styles from "../../wishlist/components/WishlistHeader.module.scss";
import { Gift, Calendar } from "lucide-react";
import { useGT, useLocale } from "gt-next";
import { formatLocalizedShortDate } from "@/lib/helpers/format-localized-short-date";
import { Wishlist } from "@/types/wishlist";
import { getAccent, visibilityIcon } from "@/lib/helpers/wishlist-helper";
import { useWishlistVisibilityLabels } from "@/lib/helpers/use-wishlist-visibility-labels";

type Props = {
  wishlist: Wishlist;
};

export function SharedWishlistHeader({ wishlist }: Props) {
  const t = useGT();
  const locale = useLocale();
  const visibilityLabels = useWishlistVisibilityLabels();
  const accent = getAccent(wishlist.accent_type);
  const visibility = visibilityLabels[wishlist.visibility_type];
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
                {description && <p className={styles.description}>{description}</p>}

                <div className={styles.badges}>
                  <span className={styles.visibilityBadge}>
                    {VisibilityIcon && <VisibilityIcon size={13} />}
                    {visibility}
                  </span>
                  <span className={styles.countBadge}>
                    {itemsCount === 1
                      ? t("{n} item", {
                          n: itemsCount,
                          $id: "wishlist.itemCount.one",
                        })
                      : t("{n} items", {
                          n: itemsCount,
                          $id: "wishlist.itemCount.other",
                        })}
                  </span>
                  {eventDate && (
                    <span className={styles.dateBadge}>
                      <Calendar size={13} />
                      {formatLocalizedShortDate(eventDate, locale)}
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
