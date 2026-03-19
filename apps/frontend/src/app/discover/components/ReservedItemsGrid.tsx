"use client";

import styles from "./ReservedItemsGrid.module.scss";
import { ReservedItemCard } from "./ReservedItemCard";
import { ReservedItem } from "@/api/types/wishilst";

type Props = {
  items: ReservedItem[];
  mode?: "reserved" | "purchased";
  onToggleReserve?: (itemId: string) => void;
  onToggleBought?: (itemId: string) => void;
  showDiscountBadge?: boolean;
};

export function ReservedItemsGrid({
  items,
  mode = "reserved",
  onToggleReserve,
  onToggleBought,
  showDiscountBadge = false,
}: Props) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={item.item_id} className={styles.cardWrap}>
          <div className={styles.ownerLine}>
            {mode === "purchased" ? "Purchased for" : "For"} {item.owner_name}
          </div>
          <ReservedItemCard
            {...item}
            mode={mode}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
            onToggleBought={onToggleBought}
          />
        </div>
      ))}
    </div>
  );
}
