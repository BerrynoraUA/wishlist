"use client";

import { useGT } from "gt-next";
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
  const t = useGT();
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={item.item_id} className={styles.cardWrap}>
          <div className={styles.ownerLine}>
            {mode === "purchased"
              ? t("Purchased for {ownerName}", {
                  ownerName: item.owner_name,
                  $id: "discover.grid.purchasedFor",
                })
              : t("For {ownerName}", {
                  ownerName: item.owner_name,
                  $id: "discover.grid.forOwner",
                })}
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
