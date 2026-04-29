import { useGT } from "gt-next";
import { ShoppingCart } from "lucide-react";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import type { ItemCardPriorityKey } from "@/lib/helpers/item-card";
import styles from "../ItemCard.module.scss";
import { cn } from "../utils";

type CardBadgesProps = {
  variant: "discover" | "reserved" | "wishlist";
  isOwner: boolean;
  statusLabel: string | null;
  isPurchased: boolean;
  salePercentOff: number | null;
  priorityKey: ItemCardPriorityKey | null;
  priorityDisplay: string | null;
};

export function CardBadges({
  isOwner,
  statusLabel,
  isPurchased,
  salePercentOff,
  priorityKey,
  priorityDisplay,
}: CardBadgesProps) {
  const t = useGT();
  const hasRightBadges = salePercentOff != null || !!priorityKey;

  return (
    <>
      {!isOwner && statusLabel && (
        <div
          className={cn(
            styles.badgeLeft,
            hasRightBadges && styles.badgeLeftWithRightStack,
            "iconTooltipTrigger",
            salePercentOff != null && styles.badgeLeftCompact,
            isPurchased && styles.purchasedBadge,
          )}
          data-tooltip={statusLabel}
          title={statusLabel}
        >
          {isPurchased ? <ShoppingCart size={14} /> : <ReservationLockIcon isReserved size={14} />}
          {salePercentOff == null && <span>{statusLabel}</span>}
        </div>
      )}

      <div className={styles.badgeStackRight}>
        {salePercentOff != null && (
          <div className={styles.saleBadge}>
            {t("Sale -{percent}%", {
              percent: salePercentOff,
              $id: "itemCard.saleBadge",
            })}
          </div>
        )}
        {priorityKey && (
          <div className={`${styles.badgeRight} ${styles[priorityKey]}`}>{priorityDisplay}</div>
        )}
      </div>
    </>
  );
}
