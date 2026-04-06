"use client";

import { useRouter } from "next/navigation";
import { useGT, useLocale } from "gt-next";
import { formatLocalizedShortDate } from "@/lib/helpers/format-localized-short-date";
import styles from "./WishlistInfo.module.scss";
import { Button } from "@/components/ui/Button/Button";
import { Calendar, Plus, Sparkles } from "lucide-react";
import { Wishlist } from "@/types/wishlist";
import { visibilityIcon } from "@/lib/helpers/wishlist-helper";
import { useWishlistVisibilityLabels } from "@/lib/helpers/use-wishlist-visibility-labels";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_LIMITS } from "@/types/subscription";

type Props = {
  wishlist: Wishlist;
  onAddItem?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
};

export function WishlistInfo({ wishlist, onAddItem }: Props) {
  const t = useGT();
  const locale = useLocale();
  const visibilityLabels = useWishlistVisibilityLabels();
  const { isPro } = useSubscription();
  const router = useRouter();
  const visibility = visibilityLabels[wishlist.visibility_type];
  const VisibilityIcon = visibilityIcon[wishlist.visibility_type];
  const itemsCount =
    wishlist.items_count ??
    (wishlist as Wishlist & { itemsCount?: number }).itemsCount ??
    0;
  const description = wishlist.description ?? "";
  const eventDate = (wishlist as Wishlist & { event_date?: string }).event_date;
  const canAddItem = Boolean(onAddItem);

  const atItemLimit = !isPro && itemsCount >= FREE_LIMITS.maxItemsPerWishlist;

  function handleAddItem() {
    if (atItemLimit) {
      router.push("/subscription");
    } else {
      onAddItem?.();
    }
  }

  return (
    <div className={styles.info}>
      <div className={styles.titleRow}>
        <div className={styles.titleGroup}>
          <h1>{wishlist.title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>

        {canAddItem && (
          <div className={styles.ownerActions}>
            {!isPro && (
              <span className={styles.limitCounter}>
                {t("{current}/{max} items", {
                  current: itemsCount,
                  max: FREE_LIMITS.maxItemsPerWishlist,
                  $id: "wishlist.header.limitCounter"
                })}
              </span>
            )}
            <Button size="sm" onClick={handleAddItem}>
              {atItemLimit ? (
                <>
                  <Sparkles size={14} />
                  <span>
                    {t("Upgrade to Add", {
                      $id: "wishlist.header.upgradeToAdd"
                    })}
                  </span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>
                    {t("Add Item", { $id: "wishlist.header.addItem" })}
                  </span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className={styles.badges}>
        <span className={styles.visibilityBadge}>
          {VisibilityIcon && <VisibilityIcon size={13} />}
          {visibility}
        </span>
        <span className={styles.countBadge}>
          {itemsCount === 1
            ? t("{n} item", { n: itemsCount, $id: "wishlist.itemCount.one" })
            : t("{n} items", { n: itemsCount, $id: "wishlist.itemCount.other" })}
        </span>
        {eventDate && (
          <span className={styles.dateBadge}>
            <Calendar size={13} />
            {formatLocalizedShortDate(eventDate, locale)}
          </span>
        )}
      </div>
    </div>
  );
}
