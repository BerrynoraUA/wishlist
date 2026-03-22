import { useMemo } from "react";
import styles from "./WishlistItemsGrid.module.scss";
import { WishlistItemCard } from "./WishlistItemCard";
import { Item } from "@/types/item";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useCurrentUserId } from "@/hooks/use-user";

type Props = {
  items: Item[];
  isOwner?: boolean;
  showDiscountBadge?: boolean;
  onToggleReserve?: (id: string) => void;
  onToggleBought?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
  openItemId?: string | null;
  onOpenItemHandled?: (id: string) => void;
};

export function WishlistItemsGrid({
  items,
  isOwner = false,
  showDiscountBadge = false,
  onToggleReserve,
  onToggleBought,
  onDelete,
  onEdit,
  openItemId,
  onOpenItemHandled,
}: Props) {
  const { data: currentUserId = "" } = useCurrentUserId();
  const reservedByIds = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.reserved_by)
            .filter(
              (id): id is string => !!id && (!currentUserId || id !== currentUserId),
            ),
        ),
      ),
    [items, currentUserId],
  );
  const { data: reservedProfiles = [] } = useProfilesByIds(reservedByIds);

  const reservedByNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of reservedProfiles) {
      map.set(p.id, p.display_name || p.nickname || "Unknown user");
    }
    return map;
  }, [reservedProfiles]);

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
            onToggleBought={onToggleBought}
            reservedByName={
              item.reserved_by ? (reservedByNameById.get(item.reserved_by) ?? null) : null
            }
            onDelete={onDelete}
            onEdit={onEdit}
            autoOpen={openItemId === item.id}
            onAutoOpenHandled={onOpenItemHandled}
          />
        ))}
      </div>
    </div>
  );
}
