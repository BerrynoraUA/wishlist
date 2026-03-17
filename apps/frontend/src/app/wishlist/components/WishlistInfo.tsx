"use client";

import { useRouter } from "next/navigation";
import styles from "./WishlistInfo.module.scss";
import { Button } from "@/components/ui/Button/Button";
import { Calendar, Plus, Sparkles } from "lucide-react";
import { Wishlist } from "@/types/wishlist";
import { visibilityLabel, visibilityIcon } from "@/lib/helpers/wishlist-helper";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_LIMITS } from "@/types/subscription";

type Props = {
  wishlist: Wishlist;
  onAddItem?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
};

export function WishlistInfo({
  wishlist,
  onAddItem,
  onEdit,
  onDelete,
  isOwner = false,
}: Props) {
  const { isPro } = useSubscription();
  const router = useRouter();
  const visibility = visibilityLabel[wishlist.visibility_type] ?? "Private";
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
                {itemsCount}/{FREE_LIMITS.maxItemsPerWishlist} items
              </span>
            )}
            <Button size="sm" onClick={handleAddItem}>
              {atItemLimit ? (
                <>
                  <Sparkles size={14} />
                  <span>Upgrade to Add</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Add Item</span>
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
  );
}
