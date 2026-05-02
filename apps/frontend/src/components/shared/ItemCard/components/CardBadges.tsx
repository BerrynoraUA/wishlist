import { useGT } from "gt-next";
import { ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReservationLockIcon } from "@/components/ui/ReservationLockIcon/ReservationLockIcon";
import styles from "../ItemCard.module.scss";
import { cn } from "../utils";

type CardBadgesProps = {
  variant: "discover" | "reserved" | "wishlist";
  isOwner: boolean;
  statusLabel: string | null;
  isPurchased: boolean;
  salePercentOff: number | null;
  priorityColor: string | null;
  priorityDisplay: string | null;
  PriorityIcon?: LucideIcon | null;
};

export function CardBadges({
  isOwner,
  statusLabel,
  isPurchased,
  salePercentOff,
  priorityColor,
  priorityDisplay,
  PriorityIcon,
}: CardBadgesProps) {
  const t = useGT();
  const hasRightBadges = salePercentOff != null || !!priorityDisplay;

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
        {priorityDisplay && (
          <div
            className={styles.badgeRight}
            style={priorityColor ? { borderColor: priorityColor, color: priorityColor } : undefined}
          >
            {PriorityIcon && <PriorityIcon size={10} strokeWidth={2.5} />}
            {priorityDisplay}
          </div>
        )}
      </div>
    </>
  );
}
