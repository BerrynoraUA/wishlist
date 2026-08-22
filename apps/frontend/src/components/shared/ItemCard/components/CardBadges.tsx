import { useGT } from "gt-next";
import type { LucideIcon } from "lucide-react";
import styles from "../ItemCard.module.scss";

type CardBadgesProps = {
  salePercentOff: number | null;
  priorityColor: string | null;
  priorityDisplay: string | null;
  PriorityIcon?: LucideIcon | null;
};

/**
 * Sale and priority badges. Reservation status is not shown here — the
 * diagonal stamp across the image already says it.
 */
export function CardBadges({
  salePercentOff,
  priorityColor,
  priorityDisplay,
  PriorityIcon,
}: CardBadgesProps) {
  const t = useGT();

  if (salePercentOff == null && !priorityDisplay) return null;

  return (
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
  );
}
