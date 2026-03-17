"use client";

import styles from "./ReservedItemsGrid.module.scss";
import { ReservedItemCard } from "./ReservedItemCard";
import { ReservedItem } from "@/api/types/wishilst";

type Props = {
  items: ReservedItem[];
  onToggleReserve?: (itemId: string) => void;
  showDiscountBadge?: boolean;
};

export function ReservedItemsGrid({
  items,
  onToggleReserve,
  showDiscountBadge = false,
}: Props) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={item.item_id} className={styles.cardWrap}>
          <div className={styles.ownerLine}> For {item.owner_name}</div>
          <ReservedItemCard
            {...item}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
          />
        </div>
      ))}
    </div>
  );
}
