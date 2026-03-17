import styles from "./WishlistItemsGrid.module.scss";
import { WishlistItemCard } from "./WishlistItemCard";
import { Item } from "@/types/item";

type Props = {
  items: Item[];
  isOwner?: boolean;
  showDiscountBadge?: boolean;
  onToggleReserve?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
};

export function WishlistItemsGrid({
  items,
  isOwner = false,
  showDiscountBadge = false,
  onToggleReserve,
  onDelete,
  onEdit,
}: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {items.map((item) => (
          <WishlistItemCard
            key={item.id}
            item={item}
            isOwner={isOwner}
            showDiscountBadge={showDiscountBadge}
            onToggleReserve={onToggleReserve}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
