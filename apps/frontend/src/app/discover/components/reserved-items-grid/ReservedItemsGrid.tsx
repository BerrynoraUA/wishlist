"use client";

import { useGT } from "gt-next";
import styles from "./ReservedItemsGrid.module.scss";
import { ItemCard, normalizeReservedItem } from "@/components/shared/ItemCard";
import { ItemDetailModal } from "../item-detail-modal/ItemDetailModal";
import { ReservedItem } from "@/api/types/wishilst";
import { getItemPriorityName } from "@/lib/helpers/item-card";

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
          <ItemCard
            {...normalizeReservedItem(item)}
            variant="reserved"
            reservedByCurrentUser
            mode={mode}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
            onToggleBought={onToggleBought}
            renderDetailModal={({ open, onClose }) => {
              const priorityName = getItemPriorityName(item.priority) ?? undefined;
              return (
                <ItemDetailModal
                  open={open}
                  onClose={onClose}
                  item={{
                    id: item.item_id,
                    title: item.title,
                    price: item.price,
                    store: item.store,
                    image: item.image,
                    isReserved: item.status !== 2,
                    status: item.status,
                    url: item.url,
                    share_url: item.share_url,
                    description: null,
                    priority: priorityName,
                    reservedByName: "you",
                    currency: item.currency,
                    additional_links: item.additional_links,
                  }}
                  onToggleReserve={onToggleReserve}
                  onToggleBought={onToggleBought}
                />
              );
            }}
          />
        </div>
      ))}
    </div>
  );
}
