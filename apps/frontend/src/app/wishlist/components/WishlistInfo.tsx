"use client";

import { useRouter } from "next/navigation";
import { useGT, useLocale } from "gt-next";
import { formatLocalizedShortDate } from "@/lib/helpers/format-localized-short-date";
import styles from "./WishlistInfo.module.scss";
import { Button } from "@/components/ui/Button/Button";
import { Calendar, Plus, Sparkles } from "lucide-react";
import { Wishlist } from "@/types/wishlist";
import {
  WISHLIST_VISIBILITY_ICONS,
  getWishlistVisibilityLabels,
} from "@/lib/constans/wishlist-metadata";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_LIMITS } from "@/types/subscription";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";

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
  const visibilityLabels = getWishlistVisibilityLabels(t);
  const { isPro } = useSubscription();
  const router = useRouter();
  const visibility = visibilityLabels[wishlist.visibility_type];
  const VisibilityIcon = WISHLIST_VISIBILITY_ICONS[wishlist.visibility_type];
  const itemsCount =
    wishlist.items_count ??
    (wishlist as Wishlist & { itemsCount?: number }).itemsCount ??
    0;
  const description = wishlist.description ?? "";
  const eventDate = (wishlist as Wishlist & { event_date?: string }).event_date;
  const canAddItem = Boolean(onAddItem);
  const atItemLimit =
    SUBSCRIPTIONS_UI_ENABLED &&
    !isPro &&
    itemsCount >= FREE_LIMITS.maxItemsPerWishlist;

  function handleAddItem() {
    if (atItemLimit) {
      router.push("/subscription");
      return;
    }
    onAddItem?.();
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
            {SUBSCRIPTIONS_UI_ENABLED && !isPro && (
              <span className={styles.limitCounter}>
                {t("{current}/{max} items", {
                  current: itemsCount,
                  max: FREE_LIMITS.maxItemsPerWishlist,
                  $id: "wishlist.header.limitCounter",
                })}
              </span>
            )}
            <Button size="sm" onClick={handleAddItem}>
              {atItemLimit ? (
                <>
                  <Sparkles size={14} />
                  <span>
                    {t("Upgrade to Add", {
                      $id: "wishlist.header.upgradeToAdd",
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
  );
}
